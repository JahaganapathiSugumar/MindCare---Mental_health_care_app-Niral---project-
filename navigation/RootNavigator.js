import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import MoodScreen from '../screens/MoodScreen';
import ReportScreen from '../screens/ReportScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import { initializeProactiveNotifications } from '../services/notifications';
import { getHasSeenOnboarding } from '../utils/storage';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { hasSelectedLanguage, isLanguageReady, language } = useLanguage();
  const { t } = useTranslation();
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  useEffect(() => {
    const bootstrapOnboardingState = async () => {
      try {
        const seen = await getHasSeenOnboarding();
        setHasSeenOnboarding(seen);
      } catch (error) {
        console.warn('[RootNavigator] Failed onboarding state read:', error?.message || error);
        setHasSeenOnboarding(false);
      } finally {
        setOnboardingLoading(false);
      }
    };

    bootstrapOnboardingState();
  }, []);

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

  useEffect(() => {
    const bootstrapNotifications = async () => {
      if (!user?.uid) {
        return;
      }

      try {
        await initializeProactiveNotifications({
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')?.[0] || t('profile.mindcareUser'),
          language,
        });
      } catch (error) {
        console.warn('[RootNavigator] Notification bootstrap failed:', error.message || error);
      }
    };

    bootstrapNotifications();
  }, [language, t, user?.uid, user?.displayName, user?.email]);

  if (loading || onboardingLoading || !isLanguageReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: '#666', fontSize: 14 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const initialRouteName = user
    ? (!hasSelectedLanguage ? 'LanguageSelection' : (hasSeenOnboarding ? 'Home' : 'Onboarding'))
    : 'SignIn';

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#f8f9fa' },
          animationEnabled: true,
        }}
        initialRouteName={initialRouteName}
      >
        {user ? (
          <>
            {!hasSelectedLanguage ? (
              <Stack.Screen
                name="LanguageSelection"
                component={LanguageSelectionScreen}
                initialParams={{
                  onCompleteRoute: hasSeenOnboarding ? 'Home' : 'Onboarding',
                }}
              />
            ) : null}
            {hasSelectedLanguage && !hasSeenOnboarding ? (
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                initialParams={{
                  userName: user.displayName || user.email?.split('@')?.[0] || t('profile.mindcareUser'),
                }}
              />
            ) : null}
            {hasSelectedLanguage ? <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} /> : null}
            {hasSelectedLanguage ? <Stack.Screen name="Profile" component={ProfileScreen} /> : null}
            {hasSelectedLanguage ? <Stack.Screen name="Chat" component={ChatScreen} /> : null}
            {hasSelectedLanguage ? <Stack.Screen name="Mood" component={MoodScreen} /> : null}
            {hasSelectedLanguage ? <Stack.Screen name="Report" component={ReportScreen} /> : null}
          </>
        ) : (
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
