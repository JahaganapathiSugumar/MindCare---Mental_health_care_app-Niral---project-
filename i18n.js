import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';
import ml from './locales/ml.json';

export const SUPPORTED_LANGUAGES = ['en', 'ta', 'hi', 'ml'];

export const LANGUAGE_META = {
  en: { code: 'en', nativeName: 'English', englishName: 'English' },
  ta: { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil' },
  hi: { code: 'hi', nativeName: 'हिंदी', englishName: 'Hindi' },
  ml: { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam' },
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      ta: { translation: ta },
      hi: { translation: hi },
      ml: { translation: ml },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

export default i18n;
