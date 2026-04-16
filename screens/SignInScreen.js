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

const SignInScreen = ({ navigation }) => {
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
        auth = await ensureAuthInitialized();
      } catch (authError) {
        // Auth failed to initialize
        console.error('[SignIn] Auth initialization error:', authError.message);
        
        Alert.alert(
          'Firebase Not Available',
          'Firebase Auth is not available in Expo Go.\n\nTry building a native development build:\n\nnpm install -g expo-dev-client\nexpo build\n\nOr check your internet connection and try again.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
      
      if (!auth) {
        Alert.alert('Error', 'Firebase auth is not available.');
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
      
      // Navigate to Home screen
      navigation.replace('Home');

      // Reset form
      setEmail('');
      setPassword('');
    } catch (error) {
      let errorMessage = 'Please try again';
      
      if (error.message && error.message.includes('Component auth has not been registered')) {
        errorMessage = 'Firebase is not ready. Please try again in a moment.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please sign up first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      }
      
      console.error('[SignIn] Sign in error:', error);
      Alert.alert('Sign In Failed', errorMessage);
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Continue your mental wellness journey
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <CustomInput
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={errors.email}
          />

          <CustomInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <CustomButton
            title="Sign In"
            onPress={handleSignIn}
            loading={loading}
            disabled={loading}
          />
        </View>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.replace('SignUp')}>
            <Text style={styles.link}>Sign Up</Text>
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
