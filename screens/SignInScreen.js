import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseInstance, ensureAuthInitialized } from '../firebase';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { validateSignIn } from '../utils/validation';
import { useTranslation } from 'react-i18next';

const SignInScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>MindCare</Text>
          <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.continueJourney')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPassword}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <CustomButton
            title={t('auth.signIn')}
            onPress={handleSignIn}
            loading={loading}
            disabled={loading}
          />
        </View>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.replace('SignUp')}>
            <Text style={styles.link}>{t('auth.signUp')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginVertical: 16,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginVertical: 8,
  },
  forgotPassword: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  link: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
});

export default SignInScreen;
