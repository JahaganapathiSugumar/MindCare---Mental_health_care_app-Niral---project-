import { signOut, updateProfile } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import { ensureAuthInitialized, getFirebaseInstance } from '../firebase';

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

export const fetchProfileData = async () => {
  const auth = await ensureAuthInitialized();
  const { db } = getFirebaseInstance();

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

  return {
    userId,
    fullName,
    email,
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
      };
    })
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
