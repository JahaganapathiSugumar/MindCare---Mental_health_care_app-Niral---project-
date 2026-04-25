import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const getRecoveryMeta = (score) => {
  if (score > 0) {
    return {
      emoji: '😊',
      title: 'Mood Recovery Score',
      message: 'Your mood improved during this conversation',
      bg: '#EAF9EF',
      border: '#BFE9CC',
      text: '#1F7A45',
    };
  }

  if (score < 0) {
    return {
      emoji: '🤝',
      title: 'Mood Recovery Score',
      message: 'Let us continue working through this together',
      bg: '#FFF4EC',
      border: '#F6D8C3',
      text: '#A4582F',
    };
  }

  return {
    emoji: '🙂',
    title: 'Mood Recovery Score',
    message: 'You are maintaining your emotional state',
    bg: '#EEF6FD',
    border: '#CFE3F3',
    text: '#2A668F',
  };
};

const MoodRecoveryCard = ({ score = 0, initialMood = 'neutral', finalMood = 'neutral' }) => {
  const { theme } = useTheme();
  const meta = getRecoveryMeta(score);

  return (
    <View style={[styles.card, { backgroundColor: meta.bg, borderColor: meta.border, shadowColor: theme.shadow || '#1A3C5A' }]}>
      <Text style={styles.emoji}>{meta.emoji}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: meta.text }]}>{meta.title}</Text>
        <Text style={[styles.message, { color: meta.text }]}>{meta.message}</Text>
        <Text style={[styles.detail, { color: meta.text }]}>
          {initialMood} -> {finalMood} | Score: {score > 0 ? `+${score}` : score}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  emoji: {
    fontSize: 18,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  message: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  detail: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.9,
    textTransform: 'capitalize',
  },
});

export default MoodRecoveryCard;
