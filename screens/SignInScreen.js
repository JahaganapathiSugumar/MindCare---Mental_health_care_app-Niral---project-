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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseInstance, ensureAuthInitialized } from '../firebase';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { validateSignIn } from '../utils/validation';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../utils/uiTokens';

const SignInScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleSignIn = async () => {
    // Reset errors
    setErrors({});

    // Validate fields
    const validationErrors = validateSignIn(email, password);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      // Ensure auth is initialized before attempting to sign in
      let auth;
      try {
        console.log('[SignIn] Initializing auth...');
        auth = await ensureAuthInitialized();
        console.log('[SignIn] Auth initialized successfully');
      } catch (authError) {
        // Auth failed to initialize
        console.error('[SignIn] Auth initialization error:', authError.message);
        
        Alert.alert(
          t('auth.firebaseConnectionErrorTitle'),
          t('auth.firebaseConnectionErrorBody'),
          [
            { text: t('common.ok') },
            { text: t('common.retry'), onPress: () => handleSignIn() }
          ]
        );
        setLoading(false);
        return;
      }
      
      if (!auth) {
        Alert.alert(
          t('auth.firebaseNotReadyTitle'),
          t('auth.firebaseNotReadyBody'),
          [
            { text: t('common.ok') },
            { text: t('common.retry'), onPress: () => handleSignIn() }
          ]
        );
        setLoading(false);
        return;
      }

      // Sign in with email and password using Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      console.log('[SignIn] User signed in successfully');

      // Reset form
      setEmail('');
      setPassword('');
    } catch (error) {
      let errorMessage = t('auth.genericError', { defaultValue: 'Please try again' });
      const isKnownConfigIssue = error.code === 'auth/configuration-not-found';
      
      if (error.message && error.message.includes('Component auth has not been registered')) {
        errorMessage = t('auth.firebaseNotReadyBody');
      } else if (isKnownConfigIssue) {
        errorMessage = t('auth.configurationMissing', { defaultValue: 'Authentication is not fully configured for this Firebase project. Enable Email/Password sign-in and try again.' });
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = t('auth.userNotFound', { defaultValue: 'User not found. Please sign up first.' });
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = t('auth.incorrectPassword', { defaultValue: 'Incorrect password' });
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('auth.invalidEmail', { defaultValue: 'Invalid email address' });
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = t('auth.invalidCredential', { defaultValue: 'Invalid email or password' });
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = t('auth.userDisabled', { defaultValue: 'This account has been disabled' });
      }
      
      if (isKnownConfigIssue) {
        console.warn('[SignIn] Firebase Auth configuration not found. Enable Email/Password in Firebase Console.');
      } else {
        console.error('[SignIn] Sign in error:', error);
      }
      Alert.alert(t('auth.signInFailed'), errorMessage);
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
    alignItems: 'center',           // ✅ center horizontally
    justifyContent: 'center',       // ✅ center vertically (if parent allows)
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
        alignItems: 'center',       // ✅ center all content inside
        justifyContent: 'center',
      }
    ]}
  >
    <View
      style={[
        styles.brandRow,
        {
          justifyContent: 'center', // ✅ center row content
          alignItems: 'center'
        }
      ]}
    >
      <View style={[styles.brandIcon, { backgroundColor: theme.card }]}>
        <MaterialCommunityIcons name="brain" size={22} color={theme.primary} />
      </View>

      <Text style={[styles.brandText, { color: theme.text, textAlign: 'center' }]}>
        MindCare
      </Text>
    </View>

    <Text style={[styles.title, { color: theme.text, fontSize: 20, fontWeight: '600',textAlign: 'center' }]}>
      {t('auth.welcomeBack')}
    </Text>

    <Text
      style={[
        styles.subtitle,
        {
          color: theme.mutedText,
          textAlign: 'center'       // ✅ center text
        }
      ]}
    >
      {t('auth.continueJourney')}
    </Text>
  </LinearGradient>
</Animated.View>

          <Animated.View
            pointerEvents="box-none"
            style={{ opacity: formOpacity, transform: [{ translateY: formTranslateY }] }}
          >
            <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
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
              placeholder={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
            />

            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.85}
            >
              <Text style={[styles.forgotPassword, { color: theme.primary }]}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            <CustomButton
              title={t('auth.signIn')}
              onPress={handleSignIn}
              loading={loading}
              disabled={loading}
            />

            </View>
          </Animated.View>

          <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.success} />
            <Text style={[styles.footerText, { color: theme.mutedText }]}> 
              {t('auth.noAccount')} 
            </Text>
            <TouchableOpacity onPress={() => navigation.replace('SignUp')}>
              <Text style={[styles.link, { color: theme.primary }]}>{t('auth.signUp')}</Text>
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  forgotPassword: {
    fontSize: 13,
    fontWeight: '700',
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

export default SignInScreen;
