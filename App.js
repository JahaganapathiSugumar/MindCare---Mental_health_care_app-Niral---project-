// Conditionally import gesture-handler to avoid issues in Expo Go
try {
  require('react-native-gesture-handler');
} catch (e) {
  console.warn('Gesture handler not available in this environment:', e.message);
}

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './navigation/RootNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './i18n';

const AppContent = () => {
  const { isDark, theme } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.background} />
      <RootNavigator />
    </>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}
