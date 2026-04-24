import { signOut, updateProfile } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, listAll, ref, uploadBytes } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAuthInitialized, getFirebaseInstance } from '../firebase';

const getLocalProfilePhotoKey = (userId) => `mindcare_profile_photo_local_${userId}`;

const saveLocalProfilePhotoUri = async (userId, uri) => {
  if (!userId || !uri) return;
  try {
    await AsyncStorage.setItem(getLocalProfilePhotoKey(userId), uri);
  } catch (_error) {
    // Non-fatal cache write failure.
  }
};

const getLocalProfilePhotoUri = async (userId) => {
  if (!userId) return null;
  try {
    return await AsyncStorage.getItem(getLocalProfilePhotoKey(userId));
  } catch (_error) {
    return null;
  }
};

const stripGsPrefix = (value = '') => value.replace(/^gs:\/\//i, '').trim();

const getStorageBucketCandidates = (app) => {
  const configuredBucket = stripGsPrefix(app?.options?.storageBucket || '');
  const projectId = (app?.options?.projectId || '').trim();

  const candidates = [
    configuredBucket || null,
    projectId ? `${projectId}.appspot.com` : null,
    projectId ? `${projectId}.firebasestorage.app` : null,
  ].filter(Boolean);

  return [...new Set(candidates)];
};

const runStorageOperationWithFallback = async (app, operation) => {
  const candidates = getStorageBucketCandidates(app);
  let lastError = null;

  for (const bucket of candidates) {
    try {
      const storage = getStorage(app, `gs://${bucket}`);
      const result = await operation(storage, bucket);
      return { result, bucket, candidates };
    } catch (error) {
      lastError = error;
      if (__DEV__) {
        console.warn('[ProfileService] Storage operation failed on bucket:', bucket, error?.code || error?.message || error);
      }
    }
  }

  if (lastError) {
    throw Object.assign(lastError, {
      _storageBucketsTried: candidates,
    });
  }

  throw new Error('No storage bucket candidates available.');
};

const isTemporaryDeviceUri = (value) => typeof value === 'string' && /^(file|content):\/\//i.test(value);

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);

const isImageDataUri = (value) => typeof value === 'string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);

const isGsUrl = (value) => typeof value === 'string' && /^gs:\/\//i.test(value);

const looksLikeStoragePath = (value) => typeof value === 'string' && !isHttpUrl(value) && !isGsUrl(value) && value.includes('/');

const resolveStorageDownloadUrl = async (app, value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isHttpUrl(trimmed)) {
    return trimmed;
  }

  if (isGsUrl(trimmed) || looksLikeStoragePath(trimmed)) {
    try {
      const { result } = await runStorageOperationWithFallback(app, async (storage) => {
        return await getDownloadURL(ref(storage, trimmed));
      });
      return result;
    } catch (_error) {
      return null;
    }
  }

  return null;
};

const toRenderablePhotoUrl = (value) => ((isHttpUrl(value) || isImageDataUri(value)) ? value : null);

const blobToDataUri = async (blob) => {
  if (!blob) {
    return null;
  }

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.onerror = () => {
      reject(new Error('Failed to encode image as Base64 data URI.'));
    };
    reader.readAsDataURL(blob);
  });
};

const encodeLocalImageToDataUri = async (localUri) => {
  const response = await fetch(localUri);
  const blob = await response.blob();
  return await blobToDataUri(blob);
};

const MAX_PROFILE_DATA_URI_CHARS = 800000;

const normalizeTimestamp = (value) => {
  if (!value) return null;

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return null;
};

const uploadLocalProfilePhotoToStorage = async (userId, localUri) => {
  const { app } = getFirebaseInstance();
  const response = await fetch(localUri);
  const blob = await response.blob();

  try {
    const { result } = await runStorageOperationWithFallback(app, async (storage) => {
      const fileRef = ref(storage, `users/${userId}/profile-${Date.now()}.jpg`);
      await uploadBytes(fileRef, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: 'public,max-age=31536000',
      });
      return await getDownloadURL(fileRef);
    });

    return result;
  } catch (error) {
    const buckets = Array.isArray(error?._storageBucketsTried) ? error._storageBucketsTried.join(', ') : 'none';
    throw new Error(
      `Profile photo upload failed in Firebase Storage (${error?.code || 'unknown'}). Buckets tried: ${buckets}. ` +
      'Verify Firebase Storage is enabled and Storage rules allow authenticated users to read/write users/{uid}.'
    );
  }
};

const extractTimestampFromProfileFileName = (name = '') => {
  const match = name.match(/profile-(\d+)\./i);
  return match ? Number(match[1]) : 0;
};

const recoverProfilePhotoFromStorage = async (app, userId) => {
  if (!app || !userId) {
    return { url: null, reason: 'missing-app-or-user' };
  }

  try {
    const { result: listResult, bucket } = await runStorageOperationWithFallback(app, async (storage) => {
      const userFolderRef = ref(storage, `users/${userId}`);
      return await listAll(userFolderRef);
    });

    if (!listResult?.items?.length) {
      return { url: null, reason: 'empty-folder', bucket };
    }

    const imageItems = listResult.items.filter((item) => {
      const name = (item?.name || '').toLowerCase();
      return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
    });

    if (!imageItems.length) {
      return { url: null, reason: 'no-image-files', bucket };
    }

    const sorted = [...imageItems].sort((a, b) => {
      const aTs = extractTimestampFromProfileFileName(a.name);
      const bTs = extractTimestampFromProfileFileName(b.name);
      if (aTs !== bTs) {
        return bTs - aTs;
      }
      return b.name.localeCompare(a.name);
    });

    const url = await getDownloadURL(sorted[0]);
    return { url, reason: 'recovered-from-storage', fileName: sorted[0]?.name || '', bucket };
  } catch (error) {
    const buckets = Array.isArray(error?._storageBucketsTried) ? error._storageBucketsTried : [];
    return {
      url: null,
      reason: error?.code || 'storage-read-failed',
      message: error?.message || 'Unable to inspect user storage folder',
      bucketsTried: buckets,
    };
  }
};

export const fetchProfileData = async () => {
  const auth = await ensureAuthInitialized();
  const { app, db } = getFirebaseInstance();

  if (!auth?.currentUser) {
    throw new Error('No authenticated user found.');
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userId = auth.currentUser.uid;
  const email = auth.currentUser.email || '';

  const userDocRef = doc(db, 'users', userId);
  const userDocSnap = await getDoc(userDocRef);

  const fullName = userDocSnap.exists()
    ? userDocSnap.data().fullName || auth.currentUser.displayName || 'MindCare User'
    : auth.currentUser.displayName || 'MindCare User';
  const userData = userDocSnap.exists() ? userDocSnap.data() : {};
  let firestorePhotoURL = userData.photoURL || userData.photoUrl || userData.profilePicture || userData.avatar || null;
  const firestoreBase64Photo = userData.photoBase64 || userData.photoDataUri || null;
  let hasTemporaryFirestoreUri = isTemporaryDeviceUri(firestorePhotoURL);

  if (hasTemporaryFirestoreUri) {
    try {
      const migratedPhotoURL = await uploadLocalProfilePhotoToStorage(userId, firestorePhotoURL);
      await setDoc(
        userDocRef,
        {
          uid: userId,
          photoURL: migratedPhotoURL,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await updateProfile(auth.currentUser, { photoURL: migratedPhotoURL });
      firestorePhotoURL = migratedPhotoURL;
      hasTemporaryFirestoreUri = false;
    } catch (_migrationError) {
      // If migration fails, fallback to auth URL or initials avatar.
      firestorePhotoURL = null;
    }
  } else {
    const resolvedFirestoreUrl = await resolveStorageDownloadUrl(app, firestorePhotoURL);
    if (resolvedFirestoreUrl && resolvedFirestoreUrl !== firestorePhotoURL) {
      firestorePhotoURL = resolvedFirestoreUrl;
      await setDoc(
        userDocRef,
        {
          uid: userId,
          photoURL: resolvedFirestoreUrl,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      // Never return unresolved storage paths/gs:// values to RN Image.
      firestorePhotoURL = resolvedFirestoreUrl || toRenderablePhotoUrl(firestorePhotoURL);
    }
  }

  const authPhotoURL = auth.currentUser.photoURL || null;
  const isTemporaryAuthUri = isTemporaryDeviceUri(authPhotoURL);
  const safeAuthPhotoURL = isTemporaryAuthUri ? null : authPhotoURL;
  const resolvedAuthPhotoURL = await resolveStorageDownloadUrl(app, safeAuthPhotoURL);
  const renderableAuthPhotoURL = toRenderablePhotoUrl(resolvedAuthPhotoURL || safeAuthPhotoURL);
  const renderableFirestorePhotoURL = toRenderablePhotoUrl(firestorePhotoURL);
  let photoURL = hasTemporaryFirestoreUri
    ? renderableAuthPhotoURL
    : (renderableFirestorePhotoURL || renderableAuthPhotoURL || null);

  if (!photoURL && isImageDataUri(firestoreBase64Photo)) {
    photoURL = firestoreBase64Photo;
  }

  let storageProbe = { reason: 'not-run' };
  if (!photoURL) {
    const recovery = await recoverProfilePhotoFromStorage(app, userId);
    storageProbe = recovery || { reason: 'unknown' };
    const recoveredPhotoURL = recovery?.url || null;

    if (recoveredPhotoURL) {
      photoURL = recoveredPhotoURL;
      await setDoc(
        userDocRef,
        {
          uid: userId,
          photoURL: recoveredPhotoURL,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      try {
        await updateProfile(auth.currentUser, { photoURL: recoveredPhotoURL });
      } catch (_syncError) {
        // Non-fatal: Firestore now contains canonical URL.
      }
    }
  }

  if (!photoURL) {
    const localCachedPhotoURL = await getLocalProfilePhotoUri(userId);
    if (isTemporaryDeviceUri(localCachedPhotoURL)) {
      photoURL = localCachedPhotoURL;
      storageProbe = {
        ...(storageProbe || {}),
        reason: 'local-cache',
      };
    }
  }

  if (__DEV__) {
    const source = renderableFirestorePhotoURL
      ? 'firestore'
      : (renderableAuthPhotoURL ? 'auth' : (isImageDataUri(firestoreBase64Photo) ? 'firestore-base64' : 'none'));
    console.log('[ProfileService] Retrieved profile photo URL:', {
      source,
      hasFirestorePhoto: !!firestorePhotoURL,
      hasFirestoreBase64Photo: !!firestoreBase64Photo,
      hasAuthPhoto: !!safeAuthPhotoURL,
      hasRenderablePhoto: !!photoURL,
      photoURL,
      storageProbe,
    });
  }

  return {
    userId,
    fullName,
    email,
    photoURL,
    preferredLanguage: userDocSnap.exists() ? (userDocSnap.data().preferredLanguage || 'en') : 'en',
    notificationsEnabled: userDocSnap.exists()
      ? userDocSnap.data().notificationsEnabled !== false
      : true,
  };
};

export const fetchMoodHistory = async (userId) => {
  const { db } = getFirebaseInstance();

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const moodsRef = collection(db, 'moods');

  let snap;
  try {
    const moodsQuery = query(
      moodsRef,
      where('userId', '==', userId),
      where('source', '==', 'ai'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    snap = await getDocs(moodsQuery);
  } catch (_error) {
    const fallbackQuery = query(moodsRef, where('userId', '==', userId), limit(20));
    snap = await getDocs(fallbackQuery);
  }

  const items = snap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        mood: data.mood || data.label || data.value || 'Unknown',
        createdAt:
          normalizeTimestamp(data.createdAt) ||
          normalizeTimestamp(data.timestamp) ||
          normalizeTimestamp(data.updatedAt),
        source: data.source || 'manual',
      };
    })
    .filter((item) => item.source === 'ai')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  return items;
};

export const logoutCurrentUser = async () => {
  const auth = await ensureAuthInitialized();
  await signOut(auth);
  return true;
};

export const updateProfileFullName = async (fullName) => {
  const trimmedName = (fullName || '').trim();

  if (!trimmedName) {
    throw new Error('Full name cannot be empty.');
  }

  const auth = await ensureAuthInitialized();
  const { db } = getFirebaseInstance();

  if (!auth?.currentUser) {
    throw new Error('No authenticated user found.');
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userId = auth.currentUser.uid;
  const userDocRef = doc(db, 'users', userId);

  await setDoc(
    userDocRef,
    {
      uid: userId,
      fullName: trimmedName,
      email: auth.currentUser.email || '',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await updateProfile(auth.currentUser, { displayName: trimmedName });

  return trimmedName;
};

export const updateProfilePhoto = async (photoURL) => {
  const trimmedPhotoURL = (photoURL || '').trim();

  if (!trimmedPhotoURL) {
    throw new Error('Profile photo URL cannot be empty.');
  }

  const auth = await ensureAuthInitialized();
  const { app, db } = getFirebaseInstance();

  if (!auth?.currentUser) {
    throw new Error('No authenticated user found.');
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userId = auth.currentUser.uid;
  const userDocRef = doc(db, 'users', userId);
  let resolvedPhotoURL = trimmedPhotoURL;

  // Expo image picker URIs are often temporary; upload them to Firebase Storage
  // so they remain available across logout/login and app restarts.
  if (isTemporaryDeviceUri(trimmedPhotoURL)) {
    try {
      resolvedPhotoURL = await uploadLocalProfilePhotoToStorage(userId, trimmedPhotoURL);
    } catch (error) {
      // Storage may be unavailable/misconfigured. Keep app usable by caching locally and Firestore Base64 fallback.
      const dataUri = await encodeLocalImageToDataUri(trimmedPhotoURL);

      if (!isImageDataUri(dataUri)) {
        throw new Error('Could not encode selected image. Please choose another photo.');
      }

      if (dataUri.length > MAX_PROFILE_DATA_URI_CHARS) {
        throw new Error('Selected image is too large for Firestore fallback. Please choose a smaller photo.');
      }

      await setDoc(
        userDocRef,
        {
          uid: userId,
          photoURL: null,
          photoBase64: dataUri,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await saveLocalProfilePhotoUri(userId, trimmedPhotoURL);
      if (__DEV__) {
        console.warn('[ProfileService] Falling back to local profile photo cache:', error?.message || error);
      }
      return dataUri;
    }
  } else {
    const fromStoragePath = await resolveStorageDownloadUrl(app, trimmedPhotoURL);
    if (fromStoragePath) {
      resolvedPhotoURL = fromStoragePath;
    }
  }

  if (!isHttpUrl(resolvedPhotoURL)) {
    throw new Error('Could not resolve profile photo to a valid image URL. Please choose a photo from your device.');
  }

  await setDoc(
    userDocRef,
    {
      uid: userId,
      photoURL: resolvedPhotoURL,
      photoBase64: null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await updateProfile(auth.currentUser, { photoURL: resolvedPhotoURL });

  if (isTemporaryDeviceUri(trimmedPhotoURL)) {
    await saveLocalProfilePhotoUri(userId, trimmedPhotoURL);
  }

  return resolvedPhotoURL;
};

export const updateNotificationPreference = async (enabled) => {
  const auth = await ensureAuthInitialized();
  const { db } = getFirebaseInstance();

  if (!auth?.currentUser) {
    throw new Error('No authenticated user found.');
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userId = auth.currentUser.uid;
  const userDocRef = doc(db, 'users', userId);

  await setDoc(
    userDocRef,
    {
      uid: userId,
      notificationsEnabled: !!enabled,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return !!enabled;
};
