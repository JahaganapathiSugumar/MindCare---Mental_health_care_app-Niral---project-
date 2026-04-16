import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseInstance } from '../firebase';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupAuthListener = async () => {
      try {
        // Initialize Firebase app and Firestore, but skip auth for now
        const { initializeFirebase } = await import('../firebase');
        try {
          await initializeFirebase();
          console.log('[RootNavigator] Firebase app and Firestore initialized');
        } catch (initError) {
          console.warn('[RootNavigator] Firebase initialization partial:', initError.message);
        }
        
        // Try to set up auth listener only if auth is available
        const { getFirebaseInstance } = await import('../firebase');
        const { auth } = getFirebaseInstance();
        
        if (auth) {
          console.log('[RootNavigator] Auth is available, setting up listener');
          const { onAuthStateChanged } = await import('firebase/auth');
          const unsubscribe = onAuthStateChanged(
            auth,
            (authUser) => {
              console.log('[RootNavigator] Auth state changed:', authUser ? 'User logged in' : 'No user');
              setUser(authUser);
              setLoading(false);
            },
            (error) => {
              console.error('[RootNavigator] Auth state error:', error);
              setLoading(false);
            }
          );
          return () => {
            if (unsubscribe) {
              unsubscribe();
            }
          };
        } else {
          // Auth not available yet, just show SignIn
          console.log('[RootNavigator] Auth not available, showing SignIn screen');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('[RootNavigator] Error setting up auth listener:', err);
        setLoading(false);
      }
    };

    let unsubscribe;
    setupAuthListener().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#f8f9fa' },
          animationEnabled: true,
        }}
        initialRouteName={user ? 'Home' : 'SignIn'}
      >
        {user ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
