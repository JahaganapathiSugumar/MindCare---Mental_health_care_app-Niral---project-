import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { getFirebaseInstance, ensureAuthInitialized } from '../firebase';

/**
 * Get the user's trusted emergency contact
 */
export const getTrustedContact = async () => {
  try {
    const auth = await ensureAuthInitialized();
    const { db } = getFirebaseInstance();

    if (!auth?.currentUser || !db) {
      return null;
    }

    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    return data.emergencyContact || null;
  } catch (error) {
    console.error('[trustedContactService] Failed to get trusted contact:', error);
    return null;
  }
};

/**
 * Check if trusted contact setup is completed
 */
export const isTrustedContactSetup = async () => {
  try {
    const auth = await ensureAuthInitialized();
    const { db } = getFirebaseInstance();

    if (!auth?.currentUser || !db) {
      return false;
    }

    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    return userDoc.exists() && !!userDoc.data().emergencyContact;
  } catch (error) {
    console.error('[trustedContactService] Failed to check trusted contact setup:', error);
    return false;
  }
};

/**
 * Check if user has skipped trusted contact setup
 */
export const hasTrustedContactBeenSkipped = async () => {
  try {
    const skipped = await AsyncStorage.getItem('trustedContactSkipped');
    return skipped === 'true';
  } catch (error) {
    console.error('[trustedContactService] Failed to check skip status:', error);
    return false;
  }
};

/**
 * Save or update a trusted emergency contact
 */
export const updateTrustedContact = async (name, phone) => {
  try {
    const auth = await ensureAuthInitialized();
    const { db } = getFirebaseInstance();

    if (!auth?.currentUser || !db) {
      throw new Error('User not authenticated or Firestore not initialized');
    }

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const emergencyContactData = {
      name: name.trim(),
      phone: phone.replace(/\s/g, ''),
      addedAt: new Date().toISOString(),
    };

    await setDoc(
      userRef,
      { emergencyContact: emergencyContactData },
      { merge: true }
    );

    // Also update local storage
    await AsyncStorage.setItem('emergencyContact', JSON.stringify(emergencyContactData));
    await AsyncStorage.setItem('trustedContactAdded', 'true');

    return emergencyContactData;
  } catch (error) {
    console.error('[trustedContactService] Failed to update trusted contact:', error);
    throw error;
  }
};

/**
 * Remove a trusted emergency contact
 */
export const removeTrustedContact = async () => {
  try {
    const auth = await ensureAuthInitialized();
    const { db } = getFirebaseInstance();

    if (!auth?.currentUser || !db) {
      throw new Error('User not authenticated or Firestore not initialized');
    }

    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      emergencyContact: deleteField(),
    });

    // Also remove from local storage
    await AsyncStorage.removeItem('emergencyContact');
    await AsyncStorage.removeItem('trustedContactAdded');

    return true;
  } catch (error) {
    console.error('[trustedContactService] Failed to remove trusted contact:', error);
    throw error;
  }
};

/**
 * Send emergency SMS notification to trusted contact
 * This function prepares the data - actual sending is done by backend via Twilio
 */
export const notifyTrustedContact = async (userId, message) => {
  try {
    const auth = await ensureAuthInitialized();
    const { db } = getFirebaseInstance();

    if (!auth?.currentUser || !db) {
      throw new Error('User not authenticated or Firestore not initialized');
    }

    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!userDoc.exists() || !userDoc.data().emergencyContact) {
      throw new Error('No trusted contact set up');
    }

    const emergencyContact = userDoc.data().emergencyContact;
    
    // Call backend API to send SMS via Twilio
    try {
      const response = await fetch('YOUR_API_URL/emergency/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || 'User',
          contactName: emergencyContact.name,
          contactPhone: emergencyContact.phone,
          message: message || 'I\'m not doing well and need someone to check on me.',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to notify contact: ${response.statusText}`);
      }

      return await response.json();
    } catch (apiError) {
      console.error('[trustedContactService] API error when notifying contact:', apiError);
      throw apiError;
    }
  } catch (error) {
    console.error('[trustedContactService] Failed to notify trusted contact:', error);
    throw error;
  }
};
