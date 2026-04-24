import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const SuggestionsPanel = ({ suggestions = [], onSuggestionPress }) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const normalizedSuggestions = useMemo(() => {
    return suggestions
      .filter((item) => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
      .slice(0, 3);
  }, [suggestions]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, normalizedSuggestions.length]);

  if (!normalizedSuggestions.length) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          backgroundColor: isDark ? '#1D2730' : '#EAF4FF',
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Ionicons name="sparkles-outline" size={14} color={theme.primary} />
        <Text style={[styles.title, { color: theme.primary }]}>{t('chat.helpfulSuggestions', { defaultValue: 'Helpful Suggestions' })}</Text>
      </View>

      <View style={styles.chipsWrap}>
        {normalizedSuggestions.map((item, index) => (
          <TouchableOpacity
            key={`${item}-${index}`}
            style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onSuggestionPress?.(item)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, { color: theme.text }]} numberOfLines={1}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 230,
  },
});

export default SuggestionsPanel;
