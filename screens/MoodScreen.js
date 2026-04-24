import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ensureAuthInitialized } from '../firebase';
import { getRecentMoods } from '../services/firebase';
import { useTranslation } from 'react-i18next';

const MOOD_OPTIONS = {
  happy: { key: 'moods.happy', emoji: '😊', color: '#3FAF62', bg: '#EAF9EF' },
  sad: { key: 'moods.sad', emoji: '😢', color: '#4A90E2', bg: '#EBF4FF' },
  neutral: { key: 'moods.neutral', emoji: '😐', color: '#7D8FA3', bg: '#F0F4F8' },
  anxious: { key: 'moods.anxious', emoji: '😟', color: '#F29C38', bg: '#FFF5E8' },
};

const getMoodMeta = (mood) => MOOD_OPTIONS[(mood || '').toLowerCase()] || {
  key: 'moods.mood',
  emoji: '🙂',
  color: '#2A7FBF',
  bg: '#EEF6FD',
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
  const [recentAIMoods, setRecentAIMoods] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#1C415F" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{t('mood.title')}</Text>
          <Text style={styles.subtitle}>{t('mood.subtitle')}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#2A7FBF" />
          <Text style={styles.loadingText}>{t('mood.loading')}</Text>
        </View>
      ) : recentAIMoods.length > 0 ? (
        <View style={styles.optionsWrap}>
          {recentAIMoods.map((item) => {
            const meta = getMoodMeta(item.mood);
            return (
              <View key={item.id} style={[styles.option, { backgroundColor: meta.bg }]}>
                <View style={styles.rowTop}>
                  <Text style={styles.optionEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.optionLabel, { color: meta.color }]}>{t(meta.key)}</Text>
                </View>
                <Text style={styles.optionMeta}>{t('mood.fromAIChat')}</Text>
                <Text style={styles.optionTime}>{getRelativeTime(item.createdAt, t)}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="robot-happy-outline" size={36} color="#2A7FBF" />
          <Text style={styles.emptyTitle}>{t('mood.emptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('mood.emptySubtitle')}</Text>
          <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('Chat')} activeOpacity={0.85}>
            <Text style={styles.chatButtonText}>{t('mood.startAIChat')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={loadAIMoods} activeOpacity={0.85}>
        <Text style={styles.refreshButtonText}>{t('mood.refresh')}</Text>
      </TouchableOpacity>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color="#4E7491" />
        <Text style={styles.infoBannerText}>
          {t('mood.manualDisabled')}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F8FD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF3FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A3D5B',
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#608099',
    fontWeight: '500',
  },
  loadingWrap: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#4E7491',
    fontWeight: '600',
  },
  optionsWrap: {
    marginTop: 22,
    paddingHorizontal: 16,
    gap: 10,
  },
  option: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  optionMeta: {
    marginTop: 4,
    color: '#5D7C93',
    fontSize: 12,
    fontWeight: '600',
  },
  optionTime: {
    marginTop: 3,
    color: '#7E97AA',
    fontSize: 12,
  },
  emptyWrap: {
    marginTop: 26,
    marginHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFEAF3',
    padding: 18,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    color: '#1C415F',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 4,
    color: '#608099',
    fontSize: 14,
    textAlign: 'center',
  },
  chatButton: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#2A7FBF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  refreshButton: {
    marginTop: 18,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#EAF3FB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  refreshButtonText: {
    color: '#2A7FBF',
    fontWeight: '700',
    fontSize: 14,
  },
  infoBanner: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#EEF6FD',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    color: '#4E7491',
    fontSize: 12,
    lineHeight: 17,
  },
});

export default MoodScreen;
