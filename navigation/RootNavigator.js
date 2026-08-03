import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import MoodScreen from '../screens/MoodScreen';
import ReportScreen from '../screens/ReportScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import TermsConditionsScreen from '../screens/TermsConditionsScreen';
import PersonalizationScreen from '../screens/PersonalizationScreen';
import TrustedContactScreen from '../screens/TrustedContactScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import ExerciseScreen from '../screens/ExerciseScreen';
import GuidedBreathingScreen from '../screens/GuidedBreathingScreen';
import WellnessStreakScreen from '../screens/WellnessStreakScreen';
import VoiceCompanionScreen from '../screens/VoiceCompanionScreen';
import AccountDataControlsScreen from '../screens/AccountDataControlsScreen';
import { initializeProactiveNotifications } from '../services/notifications';
import { getHasSeenOnboarding, setHasSeenOnboarding as setHasSeenOnboardingStorage, clearHasSeenOnboarding as clearHasSeenOnboardingStorage } from '../utils/storage';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { hasSelectedLanguage, isLanguageReady, language, resetLanguagePreference } = useLanguage();
  const { t } = useTranslation();
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [personalizationCompleted, setPersonalizationCompleted] = useState(false);
  const [personalizationLoading, setPersonalizationLoading] = useState(true);
  const [trustedContactSetup, setTrustedContactSetup] = useState(false);
  const [trustedContactLoading, setTrustedContactLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsLoading, setTermsLoading] = useState(true);

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
    const bootstrapTermsState = async () => {
      try {
        const terms = await AsyncStorage.getItem('termsAccepted');
        setTermsAccepted(terms === 'true');
      } catch (error) {
        console.warn('[RootNavigator] Failed terms state read:', error?.message || error);
        setTermsAccepted(false);
      } finally {
        setTermsLoading(false);
      }
    };

    bootstrapTermsState();
  }, []);

  useEffect(() => {
    const bootstrapPersonalizationState = async () => {
      try {
        const personalizationStatus = await AsyncStorage.getItem('personalizationCompleted');
        setPersonalizationCompleted(personalizationStatus === 'true');
      } catch (error) {
        console.warn('[RootNavigator] Failed personalization state read:', error?.message || error);
        setPersonalizationCompleted(false);
      } finally {
        setPersonalizationLoading(false);
      }
    };

    bootstrapPersonalizationState();
  }, []);

  useEffect(() => {
    const bootstrapTrustedContactState = async () => {
      try {
        const contactAdded = await AsyncStorage.getItem('trustedContactAdded');
        const contactSkipped = await AsyncStorage.getItem('trustedContactSkipped');
        setTrustedContactSetup(contactAdded === 'true' || contactSkipped === 'true');
      } catch (error) {
        console.warn('[RootNavigator] Failed trusted contact state read:', error?.message || error);
        setTrustedContactSetup(false);
      } finally {
        setTrustedContactLoading(false);
      }
    };

    bootstrapTrustedContactState();
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
            async (authUser) => {
              console.log('[RootNavigator] Auth state changed:', authUser ? `User: ${authUser.email}` : 'No user');
              
              if (authUser) {
                // Prevent rendering logged-in screens until we verify onboarding state
                setLoading(true);
                setUser(authUser);
                
                // Fetch progress from Firestore to sync local state
                try {
                  const db = getFirestore();
                  const docRef = doc(db, 'users', authUser.uid);
                  const docSnap = await getDoc(docRef);
                  
                  if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    // Update state variables
                    const isTerms = !!data.termsAccepted;
                    const isSeenOnboarding = !!data.hasSeenOnboarding;
                    const isPersonalization = !!data.personalizationCompleted;
                    const isTrusted = !!data.trustedContactSetup;
                    
                    setTermsAccepted(isTerms);
                    setHasSeenOnboarding(isSeenOnboarding);
                    setPersonalizationCompleted(isPersonalization);
                    setTrustedContactSetup(isTrusted);
                    
                    // Sync to AsyncStorage for offline persistence
                    if (isTerms) await AsyncStorage.setItem('termsAccepted', 'true');
                    else await AsyncStorage.removeItem('termsAccepted');
                    
                    if (isSeenOnboarding) await setHasSeenOnboardingStorage(true);
                    else await clearHasSeenOnboardingStorage();
                    
                    if (isPersonalization) await AsyncStorage.setItem('personalizationCompleted', 'true');
                    else await AsyncStorage.removeItem('personalizationCompleted');
                    
                    if (isTrusted) await AsyncStorage.setItem('trustedContactAdded', 'true');
                    else {
                      await AsyncStorage.removeItem('trustedContactAdded');
                      await AsyncStorage.removeItem('trustedContactSkipped');
                    }
                    
                    // If the user doesn't have a preferred language or it's a completely fresh sign up
                    // where flags aren't set, we might need to reset language preference
                    // But if they have one stored, maybe they just logged in. 
                    // To be safe, if terms are not accepted, it implies a new account flow.
                    if (!isTerms && resetLanguagePreference) {
                      await resetLanguagePreference();
                    }
                  } else {
                    // New user or missing profile, reset local state
                    setTermsAccepted(false);
                    setHasSeenOnboarding(false);
                    setPersonalizationCompleted(false);
                    setTrustedContactSetup(false);
                    
                    // Clear AsyncStorage
                    await AsyncStorage.removeItem('termsAccepted');
                    await clearHasSeenOnboardingStorage();
                    await AsyncStorage.removeItem('personalizationCompleted');
                    await AsyncStorage.removeItem('trustedContactAdded');
                    await AsyncStorage.removeItem('trustedContactSkipped');
                    
                    if (resetLanguagePreference) {
                      await resetLanguagePreference();
                    }
                  }
                } catch (e) {
                  console.warn('[RootNavigator] Error fetching user progress:', e.message || e);
                } finally {
                  setLoading(false);
                }
              } else {
                setUser(null);
                setLoading(false);
              }
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

  if (loading || onboardingLoading || personalizationLoading || trustedContactLoading || termsLoading || !isLanguageReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: '#666', fontSize: 14 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const initialRouteName = user
    ? (!hasSelectedLanguage
      ? 'LanguageSelection'
      : !termsAccepted
      ? 'TermsConditions'
      : !hasSeenOnboarding
      ? 'Onboarding'
      : !personalizationCompleted
      ? 'Personalization'
      : !trustedContactSetup
      ? 'TrustedContact'
      : 'Home')
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
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
            <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} initialParams={{ userName: user.displayName || user.email?.split('@')?.[0] || t('profile.mindcareUser') }} />
            <Stack.Screen name="Personalization" component={PersonalizationScreen} />
            <Stack.Screen name="TrustedContact" component={TrustedContactScreen} />
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="VoiceCompanion" component={VoiceCompanionScreen} options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="Exercise" component={ExerciseScreen} />
            <Stack.Screen name="GuidedBreathing" component={GuidedBreathingScreen} />
            <Stack.Screen name="WellnessStreak" component={WellnessStreakScreen} />
            <Stack.Screen name="Mood" component={MoodScreen} />
            <Stack.Screen name="Report" component={ReportScreen} />
            <Stack.Screen name="AccountDataControls" component={AccountDataControlsScreen} />
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
