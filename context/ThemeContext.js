import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, getTheme, lightTheme } from '../utils/theme';

const THEME_KEY = 'mindcare_theme_mode';

const ThemeContext = createContext({
  theme: lightTheme,
  themeMode: 'light',
  isDark: false,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
  initialized: false,
});

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState('light');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (stored === 'dark' || stored === 'light') {
          setThemeModeState(stored);
        }
      } catch (error) {
        console.warn('[Theme] Failed to load theme preference:', error?.message || error);
      } finally {
        setInitialized(true);
      }
    };

    loadTheme();
  }, []);

  const persistThemeMode = useCallback(async (nextMode) => {
    setThemeModeState(nextMode);
    try {
      await AsyncStorage.setItem(THEME_KEY, nextMode);
    } catch (error) {
      console.warn('[Theme] Failed to save theme preference:', error?.message || error);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    await persistThemeMode(nextMode);
  }, [persistThemeMode, themeMode]);

  const value = useMemo(() => {
    const theme = getTheme(themeMode);
    return {
      theme,
      themeMode,
      isDark: themeMode === 'dark',
      setThemeMode: persistThemeMode,
      toggleTheme,
      initialized,
    };
  }, [initialized, persistThemeMode, themeMode, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
