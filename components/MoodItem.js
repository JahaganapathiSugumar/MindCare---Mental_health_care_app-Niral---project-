import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const moodToEmoji = (mood) => {
  const normalized = String(mood || '').toLowerCase();

  if (normalized.includes('happy') || normalized.includes('great') || normalized.includes('joy')) return '😊';
  if (normalized.includes('calm') || normalized.includes('peace')) return '😌';
  if (normalized.includes('sad') || normalized.includes('down')) return '😔';
  if (normalized.includes('angry') || normalized.includes('stress')) return '😣';
  if (normalized.includes('anx')) return '😟';
  return '🙂';
};

const MoodItem = ({ mood, createdAt }) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const displayDate = createdAt
    ? new Date(createdAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : t('profile.notAvailable');

  const moodKey = `moods.${String(mood || '').toLowerCase()}`;
  const resolvedMoodLabel = t(moodKey, { defaultValue: mood || t('moods.unknown') });

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={[styles.moodPill, { backgroundColor: isDark ? '#252B33' : '#F1F8FF' }]}>
        <Text style={styles.emoji}>{moodToEmoji(mood)}</Text>
        <Text style={[styles.moodText, { color: theme.text }]}>{resolvedMoodLabel}</Text>
      </View>
      <Text style={[styles.dateText, { color: theme.mutedText }]}>{displayDate}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2F8',
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8FF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: '62%',
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  moodText: {
    fontSize: 14,
    color: '#244B67',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 12,
    color: '#6A879D',
    marginLeft: 10,
    flexShrink: 1,
    textAlign: 'right',
  },
});

export default MoodItem;
