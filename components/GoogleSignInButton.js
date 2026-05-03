import React from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AntDesign } from '@expo/vector-icons';

/**
 * Professional Google Sign-In Button
 * 
 * Design:
 * - White background with Google logo
 * - Rounded corners (12px)
 * - Subtle shadow effect
 * - Loading state with spinner
 * - Disabled state support
 */
const GoogleSignInButton = ({
  onPress,
  loading = false,
  disabled = false,
  style,
}) => {
  const { isDark } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
          borderColor: isDark ? '#404040' : '#E8E8E8',
          transform: [{ scale: pressed && !disabled && !loading ? 0.97 : 1 }],
          opacity: disabled || loading ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{
        color: '#00000010',
        foreground: true,
        borderless: false,
      }}
    >
      <View style={styles.content}>
        {loading ? (
          <>
            <View style={styles.logoPlaceholder}>
              <ActivityIndicator
                color={isDark ? '#FFFFFF' : '#1f2937'}
                size="small"
              />
            </View>
            <Text style={[styles.text, { color: isDark ? '#FFFFFF' : '#1f2937' }]}>
              Signing in...
            </Text>
          </>
        ) : (
          <>
            {/* Google Logo */}
<View style={styles.logoContainer}>
  <AntDesign name="google" size={20} color="#DB4437" />
</View>

<Text style={[styles.text, { color: isDark ? '#FFFFFF' : '#1f2937' }]}>
  Continue with Google
</Text>
          </>
        )}
      </View>
    </Pressable>
  );
};

/**
 * Simplified Google Logo Component
 * Using colored circles to represent Google's brand colors
 */
const GoogleLogo = ({ isDark }) => {
  return (
    <View style={styles.googleLogo}>
      {/* Using text-based approach for simplicity */}
      <Text style={styles.googleLogoText}>G</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 10,
    marginHorizontal: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4285F4',
  },
  logoPlaceholder: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleLogo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
  },
  googleLogoText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },
});

export default GoogleSignInButton;
