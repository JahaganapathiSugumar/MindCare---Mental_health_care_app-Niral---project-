import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const setupAuthListener = async () => {
      try {
        console.log('[RootNavigator] Starting Firebase initialization...');
        
        // Give the app and Firebase modules more time to fully boot up
        await new Promise(resolve => setTimeout(resolve, 2500));
        console.log('[RootNavigator] Startup delay complete, proceeding with Firebase init...');
        
        // Import Firebase functions
        const { initializeFirebase, ensureAuthInitialized } = await import('../firebase');
        
        // Initialize Firebase app and Firestore
        try {
          await initializeFirebase();
          console.log('[RootNavigator] Firebase app and Firestore initialized');
        } catch (initError) {
          console.warn('[RootNavigator] Firebase initialization failed:', initError.message);
          setAuthError(initError.message);
          // Don't fail completely, allow user to sign in manually
          setLoading(false);
          return;
        }
        
        // Try auth listener setup once, but continue to SignIn screen if not ready yet.
        try {
          console.log('[RootNavigator] Attempting to initialize auth for listener...');
          const auth = await ensureAuthInitialized();
          const unsubscribe = onAuthStateChanged(
            auth,
            (authUser) => {
              console.log('[RootNavigator] Auth state changed:', authUser ? `User: ${authUser.email}` : 'No user');
              setUser(authUser);
              setLoading(false);
            },
            (error) => {
              console.error('[RootNavigator] Auth state listener error:', error.message);
              setAuthError(error.message);
              setLoading(false);
            }
          );

          return () => {
            console.log('[RootNavigator] Cleaning up auth listener');
            if (unsubscribe) {
              unsubscribe();
            }
          };
        } catch (authError) {
          console.warn('[RootNavigator] Auth not ready at startup, continuing to SignIn:', authError.message);
          setLoading(false);
          return null;
        }
      } catch (err) {
        console.error('[RootNavigator] Unexpected error during setup:', err);
        setAuthError(err.message);
        setLoading(false);
      }
    };

    let unsubscribe;
    setupAuthListener().then(unsub => {
      if (unsub) {
        unsubscribe = unsub;
      }
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
        <Text style={{ marginTop: 10, color: '#666', fontSize: 14 }}>Initializing Firebase...</Text>
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
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
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
