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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { getFirebaseInstance, ensureAuthInitialized } from '../firebase';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { validateSignUp } from '../utils/validation';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

const SignUpScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
          <Text style={styles.title}>{t('auth.createAccount')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.joinJourney')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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

          {/* Sign Up Button */}
          <CustomButton
            title={t('auth.createAccountButton')}
            onPress={handleSignUp}
            loading={loading}
            disabled={loading}
          />
        </View>

        {/* Sign In Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.alreadyAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.replace('SignIn')}>
            <Text style={styles.link}>{t('auth.signIn')}</Text>
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
    marginTop: 40,
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    marginBottom: 12,
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

export default SignUpScreen;
