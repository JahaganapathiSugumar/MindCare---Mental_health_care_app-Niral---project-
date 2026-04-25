import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const CustomButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}) => {
  const { theme, isDark } = useTheme();
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isSecondary ? (isDark ? '#252B33' : '#EAF4FF') : theme.primary,
          borderColor: isSecondary ? theme.border : theme.primary,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        disabled || loading ? styles.disabledButton : null,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? theme.primary : '#FFFFFF'} size="small" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: isSecondary ? theme.primary : '#FFFFFF' },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#1A3C5A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default CustomButton;
