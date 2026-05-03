// Conditionally import gesture-handler to avoid issues in Expo Go
try {
  require('react-native-gesture-handler');
} catch (e) {
  console.warn('Gesture handler not available in this environment:', e.message);
}

import React, { useEffect } from 'react';
import { StatusBar, Alert } from 'expo-status-bar';
import RootNavigator from './navigation/RootNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import * as Updates from 'expo-updates';
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
  useEffect(() => {
    // Check for updates on app launch
    const checkForUpdates = async () => {
      try {
        console.log('[Updates] Checking for updates...');
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          console.log('[Updates] Update available! Fetching...');
          await Updates.fetchUpdateAsync();
          
          // Show alert and reload
          Alert.alert(
            'Update Available',
            'A new version is available. The app will now restart.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          console.log('[Updates] App is up to date');
        }
      } catch (error) {
        console.warn('[Updates] Error checking for updates:', error.message);
        // Don't break the app if update check fails
      }
    };

    checkForUpdates();
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}
