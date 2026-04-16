import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Step 2: Initialize Auth (using getAuth - with error handling for timing issues)
const initializeAuth_ = async () => {
  if (authInitializationPromise) return authInitializationPromise;

  authInitializationPromise = (async () => {
    try {
      // Ensure app is initialized first
      const appInstance = await initializeApp_();

      if (!auth) {
        try {
          console.log('[Firebase] Initializing auth with getAuth()...');
          // Use getAuth() instead of initializeAuth() to avoid component registration timing issues
          auth = getAuth(appInstance);
          console.log('[Firebase] Auth initialized successfully ✓');
        } catch (getAuthError) {
          console.warn('[Firebase] getAuth() failed, auth will be initialized on demand:', getAuthError.message);
          // Don't throw - auth will be retried on demand
          // Return null to signal that auth isn't ready yet
          return null;
        }
      }
      return auth;
    } catch (error) {
      console.error('[Firebase] Auth initialization error:', error.message);
      return null; // Return null instead of throwing
    }
  })();

  return authInitializationPromise;
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

// Main initialization function - focuses on app and firestore, skips auth
export const initializeFirebase = async () => {
  try {
    console.log('[Firebase] Initializing Firebase with config:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain
    });

    // Initialize app
    await initializeApp_();
    
    // Initialize firestore
    await initializeFirestore_();

    console.log('[Firebase] Firebase app and Firestore initialized successfully ✓');
    console.log('[Firebase] Auth will be initialized on-demand when signing in');
    
    return { app, auth: null, db };
  } catch (error) {
    console.error('[Firebase] Initialization failed:', error.message);
    // Still return what we have
    return { app, auth: null, db };
  }
};

export const getFirebaseInstance = () => {
  if (!app) {
    console.error('[Firebase] Firebase app not initialized');
  }
  if (!auth) {
    console.warn('[Firebase] Auth not initialized - will be initialized on first use');
  }
  if (!db) {
    console.error('[Firebase] Firestore not initialized');
  }
  return { app, auth, db };
};

export const ensureAuthInitialized = async () => {
  if (!app) {
    await initializeApp_();
  }
  
  // Auth might not be available in this Expo environment
  // This is a known issue with React Native 0.81 + React 19 + Expo 54
  if (!auth) {
    const appInstance = app;
    
    // Try getAuth with a longer delay
    console.log('[Firebase] Attempting to initialize auth (this may take a moment)...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      auth = getAuth(appInstance);
      console.log('[Firebase] Auth initialized ✓');
    } catch (error) {
      console.error('[Firebase] Auth initialization failed:', error.message);
      console.log('[Firebase] Note: This is a known issue with React 19. Auth may work on native builds.');
      throw error;
    }
  }
  
  return auth;
};

export default { app, auth, db };
