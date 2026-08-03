import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { 
  signInWithCredential, 
  GoogleAuthProvider,
  signOut 
} from 'firebase/auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { ensureAuthInitialized, getFirebaseInstance } from '../firebase';

// Close browser modal when authentication completes
WebBrowser.maybeCompleteAuthSession();

let googleAuthRequest = null;

/**
 * Initialize Google OAuth configuration
 * Must be called once when app starts
 * 
 * Note: You need to configure these IDs in app.json or environment:
 * - EXPO_PUBLIC_GOOGLE_CLIENT_ID: From Google Cloud Console OAuth app
 * - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: iOS specific client ID (optional)
 * - EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: Android specific client ID (optional)
 */
export const initializeGoogleAuth = () => {
  try {
    // Get environment variables for Google OAuth
    const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
    const iosClientId = isExpoGo ? undefined : process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    const androidClientId = isExpoGo ? undefined : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

    if (!expoClientId) {
      console.warn('[GoogleAuth] EXPO_PUBLIC_GOOGLE_CLIENT_ID not configured. Google Sign-In will not work.');
      console.log('[GoogleAuth] Add to your .env or app.json:');
      console.log('  EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id');
      return null;
    }

    const [request, response, promptAsync] = Google.useAuthRequest({
      clientId: expoClientId,
      iosClientId: iosClientId,
      androidClientId: androidClientId,
    });

    googleAuthRequest = { request, response, promptAsync };
    console.log('[GoogleAuth] Google Auth initialized successfully');
    return { request, response, promptAsync };
  } catch (error) {
    console.error('[GoogleAuth] Initialization error:', error.message);
    return null;
  }
};

/**
 * Get the initialized Google Auth config
 */
export const getGoogleAuthRequest = () => {
  return googleAuthRequest;
};

/**
 * Sign in with Google OAuth
 * - Opens Google account selection
 * - Authenticates with Firebase
 * - Creates or logs in user
 * - Stores user data in Firestore
 */
export const signInWithGoogle = async (promptAsync) => {
  try {
    if (!promptAsync) {
      throw new Error('Google Auth not initialized. Call initializeGoogleAuth first.');
    }

    console.log('[GoogleSignIn] Starting Google authentication...');

    // Trigger Google OAuth prompt
    const result = await promptAsync();

    if (result.type !== 'success') {
      if (result.type === 'dismiss') {
        console.log('[GoogleSignIn] User cancelled Google Sign-In');
        return {
          success: false,
          error: 'cancelled',
          message: 'Sign-in cancelled',
        };
      }
      console.warn('[GoogleSignIn] Google auth result:', result.type);
      return {
        success: false,
        error: 'auth_error',
        message: 'Authentication failed',
      };
    }

    console.log('[GoogleSignIn] Google Auth result:', JSON.stringify(result));

    // Get OAuth token from Google
    const id_token = result.params?.id_token || result.authentication?.idToken || result.params?.idToken;

    if (!id_token) {
      throw new Error('No ID token received from Google');
    }

    console.log('[GoogleSignIn] Got ID token from Google');

    // Ensure Firebase auth is initialized
    const auth = await ensureAuthInitialized();

    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    // Create Firebase credential from Google token
    const credential = GoogleAuthProvider.credential(id_token);

    // Sign in to Firebase with Google credential
    console.log('[GoogleSignIn] Signing in to Firebase...');
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    console.log('[GoogleSignIn] Firebase sign-in successful, user:', user.uid);

    // Store/update user data in Firestore
    await saveGoogleUserToFirestore(user, userCredential.additionalUserInfo?.isNewUser);

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isNewUser: userCredential.additionalUserInfo?.isNewUser,
      },
    };
  } catch (error) {
    console.error('[GoogleSignIn] Error:', error.message);

    // Categorize errors for user-friendly messages
    let errorCode = 'unknown_error';
    let errorMessage = 'Something went wrong. Please try again.';

    if (error.message?.includes('Network')) {
      errorCode = 'network_error';
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.message?.includes('cancelled')) {
      errorCode = 'cancelled';
      errorMessage = 'Sign-in cancelled';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorCode = 'not_allowed';
      errorMessage = 'Google Sign-In is not enabled. Contact support.';
    } else if (error.code === 'auth/invalid-credential') {
      errorCode = 'invalid_credential';
      errorMessage = 'Invalid credentials. Please try again.';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      errorCode = 'account_exists';
      errorMessage = 'This email is already linked to another account.';
    }

    return {
      success: false,
      error: errorCode,
      message: errorMessage,
      originalError: error.message,
    };
  }
};

/**
 * Save Google user data to Firestore
 * Creates new user doc if doesn't exist, updates if it does
 */
const saveGoogleUserToFirestore = async (user, isNewUser = false) => {
  try {
    const { db } = getFirebaseInstance();

    if (!db) {
      console.warn('[GoogleSignIn] Firestore not initialized, skipping user data save');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    // If new user or user doc doesn't exist, create it
    if (isNewUser || !userSnap.exists()) {
      console.log('[GoogleSignIn] Creating new user document');
      
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || '',
          photoURL: user.photoURL || '',
          authProvider: 'google',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSignInAt: new Date().toISOString(),
          notificationsEnabled: true,
          preferredLanguage: 'en',
        },
        { merge: false }
      );
    } else {
      // Update existing user doc
      console.log('[GoogleSignIn] Updating existing user document');
      
      await setDoc(
        userRef,
        {
          photoURL: user.photoURL || '',
          fullName: user.displayName || '',
          updatedAt: new Date().toISOString(),
          lastSignInAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    console.log('[GoogleSignIn] User data saved to Firestore');
  } catch (error) {
    console.error('[GoogleSignIn] Error saving user to Firestore:', error.message);
    // Don't throw - user is already authenticated, just warn about data storage
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
  try {
    const auth = await ensureAuthInitialized();
    if (auth) {
      await signOut(auth);
      console.log('[Auth] User signed out');
      return { success: true };
    }
  } catch (error) {
    console.error('[Auth] Sign out error:', error.message);
    return {
      success: false,
      message: 'Failed to sign out',
    };
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async () => {
  try {
    const auth = await ensureAuthInitialized();
    return auth?.currentUser || null;
  } catch (error) {
    console.error('[Auth] Error getting current user:', error.message);
    return null;
  }
};
