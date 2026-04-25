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
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseInstance } from '../firebase';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { validateEmail, getErrorMessage } from '../utils/validation';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../utils/uiTokens';

/**
 * ForgotPasswordScreen - Allows users to reset their password
 * 
 * Features:
 * - Email validation
 * - Password reset email sending
 * - Error handling
 * - Loading states
 * - Navigation back to sign in
 */
const ForgotPasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(14)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(14)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successTranslateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    if (emailSent) {
      Animated.parallel([
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(successTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

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
    ]).start();
  }, [emailSent, formOpacity, formTranslateY, heroOpacity, heroTranslateY, successOpacity, successTranslateY]);

  const handleSendResetEmail = async () => {
    // Reset errors
    setError('');

    // Validate email
    if (!email.trim()) {
      setError(t('validation.emailRequired'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('validation.emailInvalid'));
      return;
    }

    setLoading(true);

    try {
      const { auth } = getFirebaseInstance();
      
      if (!auth) {
        setError(t('auth.firebaseNotReadyBody'));
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, email.trim());
      setEmailSent(true);
      
      Alert.alert(
        t('auth.resetEmailSentTitle', { defaultValue: 'Password Reset Email Sent' }),
        t('auth.resetEmailSentBody', { defaultValue: 'Check your email for instructions to reset your password.' }),
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.replace('SignIn'),
          },
        ]
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.successContainer,
            {
              backgroundColor: theme.background,
              opacity: successOpacity,
              transform: [{ translateY: successTranslateY }],
            },
          ]}
        >
          <View style={[styles.successIconWrap, { backgroundColor: theme.secondary || '#EAF4FF' }]}>
            <Ionicons name="mail-open-outline" size={30} color={theme.primary} />
          </View>
          <Text style={[styles.successTitle, { color: theme.text }]}>{t('auth.checkEmailTitle', { defaultValue: 'Check Your Email' })}</Text>
          <Text style={[styles.successText, { color: theme.mutedText }]}>
            {t('auth.checkEmailBody', { defaultValue: "We've sent password reset instructions to {{email}}", email })}
          </Text>
          <View style={styles.successActionWrap}>
            <CustomButton
              title={t('auth.backToSignIn', { defaultValue: 'Back to Sign In' })}
              onPress={() => navigation.replace('SignIn')}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

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
          <Animated.View pointerEvents="box-none" style={{ opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }}>
            <LinearGradient
              colors={isDark ? ['#1A2129', '#121212'] : ['#EAF4FF', '#F7F9FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, { borderColor: theme.border }]}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-back" size={18} color={theme.text} />
                <Text style={[styles.backButtonText, { color: theme.text }]}>{t('common.back')}</Text>
              </TouchableOpacity>

              <Text style={[styles.title, { color: theme.text }]}>{t('auth.resetPasswordTitle', { defaultValue: 'Reset Password' })}</Text>
              <Text style={[styles.subtitle, { color: theme.mutedText }]}> 
                {t('auth.resetPasswordSubtitle', { defaultValue: 'Enter your email to receive password reset instructions' })}
              </Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View
            pointerEvents="box-none"
            style={{ opacity: formOpacity, transform: [{ translateY: formTranslateY }] }}
          >
            <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <CustomInput
              label={t('auth.email', { defaultValue: 'Email Address' })}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              error={error}
            />

            <CustomButton
              title={t('auth.sendResetEmail', { defaultValue: 'Send Reset Email' })}
              onPress={handleSendResetEmail}
              loading={loading}
              disabled={loading}
            />

            <CustomButton
              title={t('auth.signIn')}
              onPress={() => navigation.replace('SignIn')}
              variant="secondary"
            />
            </View>
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
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D7E4F2',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  successActionWrap: {
    width: '100%',
    maxWidth: 320,
  },
});

export default ForgotPasswordScreen;
