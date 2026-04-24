import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  hasSeenOnboarding: 'hasSeenOnboarding',
};

export const getHasSeenOnboarding = async () => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.hasSeenOnboarding);
    return value === 'true';
  } catch (error) {
    console.warn('[Storage] Failed to read onboarding state:', error?.message || error);
    return false;
  }
};

export const setHasSeenOnboarding = async (seen = true) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.hasSeenOnboarding, seen ? 'true' : 'false');
    return true;
  } catch (error) {
    console.warn('[Storage] Failed to save onboarding state:', error?.message || error);
    return false;
  }
};

export const clearHasSeenOnboarding = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.hasSeenOnboarding);
    return true;
  } catch (error) {
    console.warn('[Storage] Failed to clear onboarding state:', error?.message || error);
    return false;
  }
};
