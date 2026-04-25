import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ensureAuthInitialized } from '../firebase';
import { getRecentMoods } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows, spacing, typography } from '../utils/uiTokens';

const MOOD_OPTIONS = {
  happy: { key: 'moods.happy', emoji: '😊', color: '#50C878', bg: '#EAF9EF' },
  sad: { key: 'moods.sad', emoji: '😢', color: '#4A90E2', bg: '#EAF4FF' },
  neutral: { key: 'moods.neutral', emoji: '😐', color: '#7D8FA3', bg: '#F0F4F8' },
  anxious: { key: 'moods.anxious', emoji: '😟', color: '#F29C38', bg: '#FFF5E8' },
};

const getMoodMeta = (mood) => MOOD_OPTIONS[(mood || '').toLowerCase()] || {
  key: 'moods.mood',
  emoji: '🙂',
  color: '#4A90E2',
  bg: '#EAF4FF',
};

const getRelativeTime = (value, t) => {
  if (!value) {
    return t('home.justNow');
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t('home.justNow');
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) {
    return t('home.justNow');
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return t('home.minsAgo', { count: diffMinutes });
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t('home.hoursAgo', { count: diffHours });
  }

  const diffDays = Math.floor(diffHours / 24);
  return t('home.daysAgo', { count: diffDays });
};

const MoodScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const [recentAIMoods, setRecentAIMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState('neutral');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const quickMoodList = useMemo(() => ['happy', 'neutral', 'anxious', 'sad'], []);

  const loadAIMoods = useCallback(async () => {
    try {
      setLoading(true);
      const auth = await ensureAuthInitialized();

      if (!auth?.currentUser) {
        setRecentAIMoods([]);
        return;
      }

      const moods = await getRecentMoods(auth.currentUser.uid, 8);
      setRecentAIMoods(moods);
      if (moods.length > 0) {
        setSelectedMood((moods[0]?.mood || 'neutral').toLowerCase());
      }
    } catch (error) {
      console.error('[MoodScreen] Load error:', error.message || error);
      setRecentAIMoods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAIMoods();
  }, [loadAIMoods]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, selectedMood, isDark]);

  const selectedMeta = getMoodMeta(selectedMood);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <LinearGradient
        colors={isDark ? ['#1A2129', '#121212'] : ['#EAF4FF', '#F7F9FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: theme.text }]}>{t('mood.title')}</Text>
            <Text style={[styles.subtitle, { color: theme.mutedText }]}>{t('mood.subtitle')}</Text>
          </View>
        </View>

        <Animated.View style={[styles.selectorCard, { backgroundColor: theme.card, borderColor: theme.border, opacity: fadeAnim }]}> 
          <Text style={[styles.selectorTitle, { color: theme.text }]}>{t('mood.howAreYouNow', { defaultValue: 'How are you feeling right now?' })}</Text>
          <View style={styles.moodPillRow}>
            {quickMoodList.map((moodKey) => {
              const meta = getMoodMeta(moodKey);
              const active = selectedMood === moodKey;
              return (
                <TouchableOpacity
                  key={moodKey}
                  style={[
                    styles.moodPill,
                    {
                      backgroundColor: active ? meta.bg : theme.secondary || '#EAF4FF',
                      borderColor: active ? meta.color : theme.border,
                    },
                  ]}
                  activeOpacity={0.86}
                  onPress={() => setSelectedMood(moodKey)}
                >
                  <Text style={styles.moodPillEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.moodPillText, { color: active ? meta.color : theme.text }]}>{t(meta.key)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.selectorHint, { color: theme.mutedText }]}>
            {t('mood.selectorHint', { defaultValue: 'Your AI chats adapt based on your mood trend and check-ins.' })}
          </Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={[styles.loadingWrap, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.mutedText }]}>{t('mood.loading')}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.nowCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <View style={[styles.nowBadge, { backgroundColor: selectedMeta.bg }]}>
                <Text style={styles.nowEmoji}>{selectedMeta.emoji}</Text>
              </View>
              <View style={styles.nowTextWrap}>
                <Text style={[styles.nowTitle, { color: theme.text }]}>{t('mood.currentState', { defaultValue: 'Current emotional state' })}</Text>
                <Text style={[styles.nowSubtitle, { color: selectedMeta.color }]}>{t(selectedMeta.key)}</Text>
              </View>
            </View>

            <View style={styles.sectionHeadRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('mood.recentFromAI', { defaultValue: 'Recent AI mood insights' })}</Text>
              <TouchableOpacity onPress={loadAIMoods}>
                <Text style={[styles.refreshText, { color: theme.primary }]}>{t('mood.refresh')}</Text>
              </TouchableOpacity>
            </View>

            {recentAIMoods.length > 0 ? (
              <View style={styles.optionsWrap}>
                {recentAIMoods.map((item) => {
                  const meta = getMoodMeta(item.mood);
                  return (
                    <View key={item.id} style={[styles.option, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                      <View style={[styles.optionEmojiWrap, { backgroundColor: meta.bg }]}>
                        <Text style={styles.optionEmoji}>{meta.emoji}</Text>
                      </View>
                      <View style={styles.optionContent}>
                        <Text style={[styles.optionLabel, { color: theme.text }]}>{t(meta.key)}</Text>
                        <Text style={[styles.optionMeta, { color: theme.mutedText }]}>{t('mood.fromAIChat')}</Text>
                      </View>
                      <Text style={[styles.optionTime, { color: theme.mutedText }]}>{getRelativeTime(item.createdAt, t)}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyWrap, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <MaterialCommunityIcons name="robot-happy-outline" size={36} color={theme.primary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('mood.emptyTitle')}</Text>
                <Text style={[styles.emptyText, { color: theme.mutedText }]}>{t('mood.emptySubtitle')}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.chatButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('Chat')}
              activeOpacity={0.9}
            >
              <Text style={styles.chatButtonText}>{t('mood.startAIChat')}</Text>
            </TouchableOpacity>

            <View style={[styles.infoBanner, { backgroundColor: theme.secondary || '#EAF4FF', borderColor: theme.border }]}> 
              <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.infoBannerText, { color: theme.mutedText }]}>{t('mood.manualDisabled')}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: typography.subtitle,
    fontWeight: '500',
  },
  selectorCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#1A3C5A',
    ...shadows.card,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  moodPillRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  moodPillEmoji: {
    fontSize: 16,
  },
  moodPillText: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  selectorHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  loadingWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  nowCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#1A3C5A',
    ...shadows.soft,
  },
  nowBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowEmoji: {
    fontSize: 24,
  },
  nowTextWrap: {
    flex: 1,
  },
  nowTitle: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  nowSubtitle: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  sectionHeadRow: {
    marginTop: spacing.sm,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionsWrap: {
    gap: 10,
  },
  option: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionEmojiWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 20,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.body,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  optionMeta: {
    marginTop: 3,
    fontSize: 12,
  },
  optionTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: typography.body,
    lineHeight: 20,
  },
  chatButton: {
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  infoBanner: {
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});

export default MoodScreen;
