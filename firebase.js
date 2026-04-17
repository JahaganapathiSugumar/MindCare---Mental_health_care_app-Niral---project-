import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'firebase/compat/auth';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgWaao55MA3tXgh-S53Whb6_UomPTDIVw",
  authDomain: "mentalhealthapp-86f1e.firebaseapp.com",
  projectId: "mentalhealthapp-86f1e",
  storageBucket: "mentalhealthapp-86f1e.firebasestorage.app",
  messagingSenderId: "816701960405",
  appId: "1:816701960405:web:7b2a1ab842a4633781b25c",
  measurementId: "G-7CTTW2S73D"
};

let app = null;
let auth = null;
let db = null;
let appInitializationPromise = null;
let authInitializationPromise = null;
let dbInitializationPromise = null;

// Step 1: Initialize Firebase App (happens immediately)
const initializeApp_ = async () => {
  if (appInitializationPromise) return appInitializationPromise;
  
  appInitializationPromise = (async () => {
    try {
      if (!app) {
        app = initializeApp(firebaseConfig);
        console.log('[Firebase] App initialized successfully');
      }
      return app;
    } catch (error) {
      console.error('[Firebase] App initialization error:', error.message);
      throw error;
    }
  })();

  return appInitializationPromise;
};


// Helper function: Retry with exponential backoff
const retryWithBackoff = async (fn, maxAttempts = 15, initialDelay = 500) => {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`[Firebase] Attempt ${attempt + 1}/${maxAttempts} failed: ${error.message || error.code || 'Unknown error'}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Step 2: Initialize Auth with AsyncStorage persistence
const initializeAuth_ = async () => {
  if (auth) {
    return auth;
  }

  // Return in-flight initialization promise
  if (authInitializationPromise) {
    return authInitializationPromise;
  }

  authInitializationPromise = (async () => {
    try {
      // Ensure app is initialized first
      const appInstance = await initializeApp_();

      // Check if auth was already initialized
      if (auth) {
        console.log('[Firebase] Auth already initialized, returning cached instance ✓');
        return auth;
      }

      console.log('[Firebase] Starting auth initialization with AsyncStorage persistence...');
      
      // Use initializeAuth with AsyncStorage for proper React Native persistence
      await retryWithBackoff(async () => {
        const authModule = await import('firebase/auth');
        const initAuth = authModule.initializeAuth;
        const rnPersistence = authModule.getReactNativePersistence;
        const readAuth = authModule.getAuth;

        try {
          console.log('[Firebase] Calling initializeAuth with AsyncStorage...');
          
          auth = initAuth(appInstance, {
            persistence: rnPersistence(AsyncStorage),
          });
          
          console.log('[Firebase] Auth initialized successfully with AsyncStorage persistence ✓');
        } catch (error) {
          // If auth is already initialized, get the existing instance
          if (error.code === 'auth/already-initialized') {
            console.log('[Firebase] Auth already initialized on this app, getting existing instance...');
            auth = readAuth(appInstance);
            console.log('[Firebase] Auth instance retrieved successfully ✓');
            return;
          }
          // Re-throw to trigger retry for timing issues
          throw error;
        }
      });
      
      return auth;
    } catch (error) {
      console.error('[Firebase] Auth initialization error:', error.message);
      throw error;
    }
  })();

  try {
    return await authInitializationPromise;
  } catch (error) {
    // Reset the promise so a future on-demand auth init can retry cleanly.
    authInitializationPromise = null;
    throw error;
  }
};


// Step 3: Initialize Firestore
const initializeFirestore_ = async () => {
  if (dbInitializationPromise) return dbInitializationPromise;

  dbInitializationPromise = (async () => {
    try {
      const appInstance = await initializeApp_();
      
      if (!db) {
        db = getFirestore(appInstance);
        console.log('[Firebase] Firestore initialized successfully');
      }
      return db;
    } catch (error) {
      console.error('[Firebase] Firestore initialization error:', error.message);
      throw error;
    }
  })();

  return dbInitializationPromise;
};

// Main initialization function - initializes app, auth, and firestore
export const initializeFirebase = async () => {
  try {
    console.log('[Firebase] Initializing Firebase with config:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain
    });

    // Initialize app first
    await initializeApp_();
    
    // Initialize firestore
    await initializeFirestore_();

    // Auth is initialized on-demand to avoid early React Native module timing issues.
    console.log('[Firebase] Firebase app and Firestore initialized successfully ✓');
    
    return { app, auth, db };
  } catch (error) {
    console.error('[Firebase] Critical initialization failed:', error.message);
    throw error; // Critical errors should be thrown
  }
};

export const getFirebaseInstance = () => {
  if (!app) {
    console.error('[Firebase] Firebase app not initialized');
  }
  if (!db) {
    console.error('[Firebase] Firestore not initialized');
  }
  return { app, auth, db };
};

export const getAuth_ = () => {
  return auth;
};

export const ensureAuthInitialized = async () => {
  if (!app) {
    await initializeApp_();
  }
  
  // Just use the cached initialization promise from initializeAuth_
  // This prevents double initialization
  const result = await initializeAuth_();
  
  if (!result) {
    throw new Error('Auth initialization failed - returned null');
  }
  
  return result;
};

export default { app, auth, db };

