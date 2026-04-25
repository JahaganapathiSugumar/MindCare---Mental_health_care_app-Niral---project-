import React, { useRef, useState } from 'react';
import {
  View,
  Pressable,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

const CustomInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  editable = true,
  error = '',
}) => {
  const { theme, isDark } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.text }]}>{label}</Text>}
      <Pressable
        onPress={() => {
          if (editable) {
            inputRef.current?.focus();
          }
        }}
        style={[
          styles.inputContainer,
          {
            borderColor: error ? '#D85C5C' : isFocused ? theme.primary : theme.border,
            backgroundColor: theme.inputBackground,
          },
          isFocused ? styles.inputFocused : null,
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.mutedText}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={
            secureTextEntry && !isPasswordVisible
          }
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="center"
          underlineColorAndroid="transparent"
          selectionColor={theme.primary}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name={isPasswordVisible ? 'visibility' : 'visibility-off'}
              size={20}
              color={isDark ? '#9FC4E8' : theme.primary}
            />
          </TouchableOpacity>
        )}
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  inputFocused: {
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#D85C5C',
    fontWeight: '600',
  },
});

export default CustomInput;
