import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { LANGUAGE_META, SUPPORTED_LANGUAGES } from '../i18n';
import { ensureAuthInitialized } from '../firebase';
import { setUserLanguage } from '../services/firebase';

const LANGUAGE_STORAGE_KEY = 'appLanguage';

const LanguageContext = createContext({
  language: 'en',
  isLanguageReady: false,
  hasSelectedLanguage: false,
  supportedLanguages: SUPPORTED_LANGUAGES,
  languageMeta: LANGUAGE_META,
  setLanguage: async () => {},
  resetLanguagePreference: async () => {},
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [isLanguageReady, setLanguageReady] = useState(false);
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);

  const persistUserLanguage = useCallback(async (nextLanguage) => {
    try {
      const auth = await ensureAuthInitialized();
      const userId = auth?.currentUser?.uid;
      if (userId) {
        await setUserLanguage(userId, nextLanguage);
      }
    } catch (error) {
      console.warn('[LanguageContext] Failed to persist language in Firestore:', error?.message || error);
    }
  }, []);

  const setLanguage = useCallback(async (nextLanguage, options = {}) => {
    const safeLanguage = SUPPORTED_LANGUAGES.includes(nextLanguage) ? nextLanguage : 'en';

    await i18n.changeLanguage(safeLanguage);
    setLanguageState(safeLanguage);
    setHasSelectedLanguage(true);

    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, safeLanguage);

    if (options.syncToProfile !== false) {
      await persistUserLanguage(safeLanguage);
    }
  }, [persistUserLanguage]);

  const resetLanguagePreference = useCallback(async () => {
    await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY);
    setHasSelectedLanguage(false);
  }, []);

  useEffect(() => {
    const bootstrapLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
          await i18n.changeLanguage(saved);
          setLanguageState(saved);
          setHasSelectedLanguage(true);
          return;
        }

        await i18n.changeLanguage('en');
        setLanguageState('en');
        setHasSelectedLanguage(false);
      } catch (error) {
        console.warn('[LanguageContext] Failed to load language:', error?.message || error);
        await i18n.changeLanguage('en');
        setLanguageState('en');
        setHasSelectedLanguage(false);
      } finally {
        setLanguageReady(true);
      }
    };

    bootstrapLanguage();
  }, []);

  const value = useMemo(() => ({
    language,
    isLanguageReady,
    hasSelectedLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    languageMeta: LANGUAGE_META,
    setLanguage,
    resetLanguagePreference,
  }), [hasSelectedLanguage, isLanguageReady, language, resetLanguagePreference, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export const LANGUAGE_KEYS = {
  storage: LANGUAGE_STORAGE_KEY,
};
