import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { getFirebaseInstance, ensureAuthInitialized } from '../firebase';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { validateSignUp } from '../utils/validation';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../utils/uiTokens';

const SignUpScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(14)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(14)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(90, [
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(heroTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 340,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 340,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [footerOpacity, formOpacity, formTranslateY, heroOpacity, heroTranslateY]);

  const handleSignUp = async () => {
    // Reset errors
    setErrors({});

    // Validate fields
    const validationErrors = validateSignUp(
      fullName,
      email,
      password,
      confirmPassword
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      // Ensure auth is initialized before attempting to sign up
      let auth;
      try {
        console.log('[SignUp] Initializing auth...');
        auth = await ensureAuthInitialized();
        console.log('[SignUp] Auth initialized successfully');
      } catch (authError) {
        // Auth failed to initialize - this can happen due to React Native timing issues
        console.error('[SignUp] Auth initialization error:', authError.message);
        Alert.alert(
          t('auth.firebaseConnectionErrorTitle'),
          t('auth.firebaseConnectionErrorBody'),
          [
            { text: t('common.ok') },
            { text: t('common.retry'), onPress: () => handleSignUp() }
          ]
        );
        setLoading(false);
        return;
      }
      
      const { db } = getFirebaseInstance();
      
      if (!auth) {
        Alert.alert(
          t('auth.firebaseNotReadyTitle'),
          t('auth.firebaseNotReadyBody'),
          [
            { text: t('common.ok') },
            { text: t('common.retry'), onPress: () => handleSignUp() }
          ]
        );
        setLoading(false);
        return;
      }

      if (!db) {
        Alert.alert(t('auth.genericError', { defaultValue: 'Error' }), t('auth.firestoreNotReady', { defaultValue: 'Firestore not initialized. Please try again.' }));
        setLoading(false);
        return;
      }

      // Create user with email and password using Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;

      // Store user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        fullName: fullName.trim(),
        email: email.trim(),
        preferredLanguage: language || 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log('[SignUp] User account created successfully');
      
      // Reset form
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      Alert.alert(t('auth.signUpSuccessTitle'), t('auth.signUpSuccessBody'));
    } catch (error) {
      let errorMessage = t('auth.genericError', { defaultValue: 'Please try again' });
      const isKnownConfigIssue = error.code === 'auth/configuration-not-found';
      
      if (error.message && error.message.includes('Component auth has not been registered')) {
        errorMessage = t('auth.firebaseNotReadyBody');
      } else if (isKnownConfigIssue) {
        errorMessage = t('auth.configurationMissing', { defaultValue: 'Authentication is not fully configured for this Firebase project. Enable Email/Password sign-in and try again.' });
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('auth.emailInUse', { defaultValue: 'Email already in use' });
      } else if (error.code === 'auth/weak-password') {
        errorMessage = t('auth.weakPassword', { defaultValue: 'Password is too weak (minimum 6 characters)' });
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('auth.invalidEmail', { defaultValue: 'Invalid email address' });
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = t('auth.operationNotAllowed', { defaultValue: 'Email/password sign up is not enabled' });
      }
      
      if (isKnownConfigIssue) {
        console.warn('[SignUp] Firebase Auth configuration not found. Enable Email/Password in Firebase Console.');
      } else {
        console.error('[SignUp] Sign up error:', error);
      }
      Alert.alert(t('auth.signUpFailed'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      {!isDark ? <View pointerEvents="none" style={styles.bgCircleTop} /> : null}
      {!isDark ? <View pointerEvents="none" style={styles.bgCircleBottom} /> : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <Animated.View
  pointerEvents="box-none"
  style={{
    opacity: heroOpacity,
    transform: [{ translateY: heroTranslateY }],
    alignItems: 'center',
    width: '100%',
  }}
>
  <LinearGradient
    colors={isDark ? ['#1A2129', '#121212'] : ['#EAF4FF', '#F7F9FC']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[
      styles.hero,
      {
        borderColor: theme.border,
        alignItems: 'center',
        justifyContent: 'center',
      },
    ]}
  >
    <View
      style={[
        styles.brandRow,
        { justifyContent: 'center', alignItems: 'center' },
      ]}
    >
      <View style={[styles.brandIcon, { backgroundColor: theme.card }]}>
        <MaterialCommunityIcons
          name="heart-pulse"
          size={22}
          color={theme.primary}
        />
      </View>

      {/* 🔥 Bigger brand name */}
      <Text
        style={[
          styles.brandText,
          {
            color: theme.text,
            fontSize: 28,
            fontWeight: '800',
            letterSpacing: 1,
            textAlign: 'center',
          },
        ]}
      >
        MindCare
      </Text>
    </View>

    {/* 👇 Smaller than brand */}
    <Text
      style={[
        styles.title,
        {
          color: theme.text,
          fontSize: 20,
          fontWeight: '600',
          textAlign: 'center',
        },
      ]}
    >
      {t('auth.createAccount')}
    </Text>

    <Text
      style={[
        styles.subtitle,
        {
          color: theme.mutedText,
          textAlign: 'center',
        },
      ]}
    >
      {t('auth.joinJourney')}
    </Text>
  </LinearGradient>
</Animated.View>

          <Animated.View
            pointerEvents="box-none"
            style={{ opacity: formOpacity, transform: [{ translateY: formTranslateY }] }}
          >
            <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <CustomInput
              label={t('auth.fullName')}
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
              error={errors.fullName}
            />

            <CustomInput
              label={t('auth.email')}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              error={errors.email}
            />

            <CustomInput
              label={t('auth.password')}
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
            />

            <CustomInput
              label={t('auth.confirmPassword')}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={errors.confirmPassword}
            />

            <CustomButton
              title={t('auth.createAccountButton')}
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
            />
            </View>
          </Animated.View>

          <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
            <Ionicons name="sparkles-outline" size={16} color={theme.primary} />
            <Text style={[styles.footerText, { color: theme.mutedText }]}> 
              {t('auth.alreadyAccount')} 
            </Text>
            <TouchableOpacity onPress={() => navigation.replace('SignIn')}>
              <Text style={[styles.link, { color: theme.primary }]}>{t('auth.signIn')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgCircleTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#E6F2FF',
    top: -130,
    right: -90,
    opacity: 0.82,
  },
  bgCircleBottom: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#F1F7FF',
    bottom: -170,
    left: -110,
    opacity: 0.9,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  hero: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: '#1A3C5A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  formCard: {
    marginTop: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#1A3C5A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 13,
    marginLeft: 4,
  },
  link: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SignUpScreen;
