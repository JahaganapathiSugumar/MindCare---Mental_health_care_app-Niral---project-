// Conditionally import gesture-handler to avoid issues in Expo Go
try {
  require('react-native-gesture-handler');
} catch (e) {
  console.warn('Gesture handler not available in this environment:', e.message);
}

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './navigation/RootNavigator';

export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <RootNavigator />
    </>
  );
}
