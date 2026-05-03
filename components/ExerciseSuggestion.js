import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

/**
 * Exercise Suggestion Card Component
 * 
 * Displays recommendation to try an exercise when anxious mood detected
 * Can be integrated into Chat or Home screens
 */
const ExerciseSuggestion = ({ 
  mood = 'anxious', 
  onPress, 
  dismissed = false 
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  if (dismissed) {
    return null;
  }

  const getSuggestion = () => {
    if (mood === 'anxious') {
      return {
        emoji: '😟',
        title: 'Feeling Anxious?',
        message: 'Try a quick breathing exercise to calm your mind',
        type: 'breathing',
        duration: '1 min',
        color: '#F29C38',
      };
    }

    if (mood === 'sad') {
      return {
        emoji: '😢',
        title: 'Feeling Down?',
        message: 'A grounding exercise can help reconnect with the present',
        type: 'grounding',
        duration: '2 min',
        color: '#4A90E2',
      };
    }

    return null;
  };

  const suggestion = getSuggestion();
  if (!suggestion) return null;

  return (
    <Animated.View style={[{ opacity: fadeAnim }]}>
      <LinearGradient
        colors={isDark ? ['#1a2a3a', '#0f1820'] : ['#FFF5E8', '#FFF9F0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.container,
          {
            borderColor: suggestion.color,
            backgroundColor: isDark ? '#1a2a3a' : '#FFF5E8',
          },
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={styles.content}
        >
          <View style={styles.header}>
            <Text style={styles.emoji}>{suggestion.emoji}</Text>
            <View style={styles.textSection}>
              <Text style={[styles.title, { color: theme.text }]}>
                {suggestion.title}
              </Text>
              <Text style={[styles.message, { color: theme.mutedText }]}>
                {suggestion.message}
              </Text>
            </View>
          </View>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="timer" size={14} color={suggestion.color} />
              <Text style={[styles.metaText, { color: suggestion.color }]}>
                {suggestion.duration}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </View>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ExerciseSuggestion;
