// This is an alternative firebase.js that uses environment variables
// Use this if you want to keep credentials separate from code

// To use this version:
// 1. Copy your Firebase config values to .env file
// 2. Replace firebase.js content with this file
// 3. Create .env file with values from FIREBASE_SETUP.md

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase Configuration from environment variables
// These values should be set in .env file
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Validate that all required Firebase config values are present
const validateFirebaseConfig = () => {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingKeys = requiredKeys.filter(
    (key) => !firebaseConfig[key] || firebaseConfig[key] === 'undefined'
  );

  if (missingKeys.length > 0) {
    console.error(
      'Missing Firebase configuration:',
      missingKeys.join(', '),
      '\nMake sure your .env file contains all required values.'
    );
    return false;
  }

  return true;
};

// Validate on initialization
if (!validateFirebaseConfig()) {
  console.error('Firebase configuration validation failed!');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize Firestore
export const db = getFirestore(app);

export default app;
