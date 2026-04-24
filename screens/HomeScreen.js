import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ensureAuthInitialized } from '../firebase';
import { fetchProfileData } from '../services/profileService';
import { getChatHistoryWindow, getMoodHistoryWindow, getRecentChats, getRecentMoods } from '../services/firebase';
import { initializeProactiveNotifications } from '../services/notifications';
import { useTheme } from '../context/ThemeContext';
import { generateAIInsights } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

const MOOD_META = {
  happy: { emoji: '😊', key: 'moods.happy', accent: '#3FAF62', soft: '#EAF9EF' },
  sad: { emoji: '😢', key: 'moods.sad', accent: '#4A90E2', soft: '#EBF4FF' },
  neutral: { emoji: '😐', key: 'moods.neutral', accent: '#7D8FA3', soft: '#F0F4F8' },
  anxious: { emoji: '😟', key: 'moods.anxious', accent: '#F29C38', soft: '#FFF5E8' },
};

const MOOD_SCORE = {
  happy: 4,
  neutral: 3,
  sad: 2,
  anxious: 1,
};

const getMoodMeta = (mood) => MOOD_META[(mood || '').toLowerCase()] || {
  emoji: '🙂',
  key: 'moods.mood',
  accent: '#5D86A6',
  soft: '#EFF5FA',
};

const getRelativeTime = (value, t) => {
  if (!value) {
    return t('home.justNow');
  }

  const now = Date.now();
  const inputDate = value instanceof Date ? value : new Date(value);
  const timestamp = inputDate.getTime();

  if (Number.isNaN(timestamp)) {
    return t('home.justNow');
  }

  const diffMs = now - timestamp;
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
  if (diffDays < 7) {
    return t('home.daysAgo', { count: diffDays });
  }

  return inputDate.toLocaleDateString();
};

const formatMoodTimestamp = (value, t) => {
  if (!value) {
    return t('home.justNow');
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t('home.justNow');
  }

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return `${t('common.today')}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const getMoodInsight = (moods, t) => {
  if (!moods || moods.length < 2) {
    return t('home.moodInsightNeedMore', { defaultValue: 'Add a few more check-ins and I will surface your trend insights here.' });
  }

  const scores = moods
    .map((item) => MOOD_SCORE[(item.mood || '').toLowerCase()] || 2.5)
    .filter((value) => typeof value === 'number');

  if (!scores.length) {
    return t('home.moodInsightAwareness', { defaultValue: 'You are building emotional awareness. Keep checking in.' });
  }

  const latest = scores[0];
  const oldest = scores[scores.length - 1];

  if (latest > oldest) {
    return t('home.moodInsightUp', { defaultValue: 'You have been feeling better this week. Keep nurturing what is helping.' });
  }

  if (latest < oldest) {
    return t('home.moodInsightDown', { defaultValue: 'Your mood has dipped recently. Try a short grounding exercise and check in again.' });
  }

  return t('home.moodInsightSteady', { defaultValue: 'Your mood trend looks steady. Consistency is a strong sign of self-awareness.' });
};

const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const [userName, setUserName] = useState('');
  const [profilePhotoURL, setProfilePhotoURL] = useState(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [latestMood, setLatestMood] = useState(null);
  const [recentMoods, setRecentMoods] = useState([]);
  const [moodLoading, setMoodLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [recentChatsLoading, setRecentChatsLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insights, setInsights] = useState([]);
  const [insightTrend, setInsightTrend] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const recentChatsAnim = useRef(new Animated.Value(0)).current;
  const moodEmojiAnim = useRef(new Animated.Value(0.85)).current;
  const themeFadeAnim = useRef(new Animated.Value(1)).current;
  const insightsIntervalRef = useRef(null);

  const moodTrendData = recentMoods.map((item, index) => {
    const mood = (item.mood || '').toLowerCase();
    const score = MOOD_SCORE[mood] || 2.5;
    const height = 16 + score * 8;
    return {
      id: item.id || `${mood}-${index}`,
      mood,
      label: index === 0 ? t('home.now') : `${index + 1}d`,
      height,
      meta: getMoodMeta(mood),
    };
  });

  useEffect(() => {
    // Animate greeting on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Load user data
    loadUserData();
  }, []);

  useEffect(() => {
    themeFadeAnim.setValue(0.72);
    Animated.timing(themeFadeAnim, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [isDark, themeFadeAnim]);

  useFocusEffect(
    useCallback(() => {
      loadUserData();

      return () => {
        if (insightsIntervalRef.current) {
          clearInterval(insightsIntervalRef.current);
        }
      };
    }, [])
  );

  const buildTrendSeries = (moodItems) => {
    const scoreMap = {
      happy: 4,
      neutral: 3,
      sad: 2,
      anxious: 1,
    };

    const today = new Date();
    const dayBuckets = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - offset);
      dayBuckets.push({ date: d, scores: [] });
    }

    moodItems.forEach((item) => {
      const date = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const moodScore = scoreMap[(item.mood || '').toLowerCase()] || 2.5;

      const bucket = dayBuckets.find((entry) => entry.date.getTime() === start.getTime());
      if (bucket) {
        bucket.scores.push(moodScore);
      }
    });

    return dayBuckets.map((bucket) => {
      const avg = bucket.scores.length
        ? bucket.scores.reduce((sum, value) => sum + value, 0) / bucket.scores.length
        : 2.5;
      return {
        id: bucket.date.toISOString(),
        value: avg,
        label: bucket.date.toLocaleDateString([], { weekday: 'short' }).slice(0, 1),
      };
    });
  };

  const loadAIInsights = async (userId, profileName = '') => {
    try {
      setInsightsLoading(true);

      const [moodWindow, chatWindow] = await Promise.all([
        getMoodHistoryWindow(userId, 14, 60),
        getChatHistoryWindow(userId, 14, 100),
      ]);

      setInsightTrend(buildTrendSeries(moodWindow));

      const result = await generateAIInsights(
        userId,
        moodWindow.map((item) => ({
          mood: item.mood,
          createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
        })),
        chatWindow.map((item) => ({
          message: item.message,
          detectedMood: item.detectedMood,
          createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
        })),
        language
      );

      if (result.success && result.insights.length) {
        setInsights(result.insights.slice(0, 3));
      } else {
        setInsights([
          `${profileName || t('profile.mindcareUser')} ${t('home.defaultInsight1', { defaultValue: 'are building awareness through regular check-ins.' })}`,
          t('home.defaultInsight2', { defaultValue: 'Keep sharing how you feel to unlock deeper personalized patterns.' }),
        ]);
      }
    } catch (error) {
      console.warn('[HomeScreen] Insights load error:', error.message || error);
      setInsights([
        t('home.defaultInsightError1', { defaultValue: 'Your recent activity is being tracked for personalized insights.' }),
        t('home.defaultInsightError2', { defaultValue: 'Check in daily to build a clearer emotional trend.' }),
      ]);
      setInsightTrend(buildTrendSeries([]));
    } finally {
      setInsightsLoading(false);
    }
  };

  const loadUserData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      setRecentChatsLoading(true);
      setMoodLoading(true);
      const auth = await ensureAuthInitialized();
      if (auth?.currentUser) {
        const profile = await fetchProfileData();
        setUserName(profile.fullName || profile.email.split('@')[0]);
        setProfilePhotoURL(profile.photoURL || null);
        setProfilePhotoError(false);

        const moods = await getRecentMoods(auth.currentUser.uid, 3);
        setRecentMoods(moods);
        setLatestMood(moods.length > 0 ? moods[0] : null);

        moodEmojiAnim.setValue(0.85);
        Animated.spring(moodEmojiAnim, {
          toValue: 1,
          friction: 6,
          tension: 75,
          useNativeDriver: true,
        }).start();

        const latestChats = await getRecentChats(auth.currentUser.uid, 3);
        setRecentChats(latestChats);

        await loadAIInsights(auth.currentUser.uid, profile.fullName || userName || t('profile.mindcareUser'));

        if (!insightsIntervalRef.current) {
          insightsIntervalRef.current = setInterval(() => {
            loadAIInsights(auth.currentUser.uid, profile.fullName || userName || t('profile.mindcareUser'));
          }, 1000 * 60 * 8);
        }

        await initializeProactiveNotifications({
          userId: auth.currentUser.uid,
          userName: profile.fullName || profile.email?.split('@')?.[0] || t('profile.mindcareUser'),
          language,
        });

        recentChatsAnim.setValue(0);
        Animated.timing(recentChatsAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('[HomeScreen] Load error:', error.message);
    } finally {
      setLoading(false);
      setMoodLoading(false);
      setRecentChatsLoading(false);
      setRefreshing(false);
    }
  };

  const handleNavigate = (screen) => {
    navigation.navigate(screen);
  };

  const handleOpenRecentChat = async (chat) => {
    try {
      await Haptics.selectionAsync();
    } catch (_error) {
      // Ignore haptics failures on unsupported devices.
    }

    navigation.navigate('Chat', {
      highlightChatId: chat.id,
      previewChat: {
        id: chat.id,
        message: chat.message || '',
        response: chat.response || '',
        createdAt: chat.createdAt instanceof Date ? chat.createdAt.toISOString() : chat.createdAt || null,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
        style={{ opacity: themeFadeAnim }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadUserData(true)}
            tintColor={theme.primary}
          />
        }
      >
        {/* Header Section with Gradient */}
        <LinearGradient
          colors={isDark ? ['#1A2B3A', '#162432'] : ['#4A90E2', '#357ABD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Animated.View
  style={[
    styles.greetingSection,
    {
      marginTop: 4,
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    },
  ]}
>
  <Text style={styles.greeting}>
    {t('home.hello', { name: userName || t('profile.mindcareUser') })}
  </Text>
  <Text style={styles.subgreeting}>
    {t('home.howFeeling')}
  </Text>
</Animated.View>

            {/* Profile Button */}
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => handleNavigate('Profile')}
              activeOpacity={0.7}
            >
              <View style={styles.profileButtonInner}>
                {profilePhotoURL && !profilePhotoError ? (
                  <Image
                    source={{ uri: profilePhotoURL }}
                    style={styles.profileAvatarImage}
                    onError={(event) => {
                      console.warn('[HomeScreen] Profile photo load failed:', profilePhotoURL, event?.nativeEvent?.error || 'Unknown image error');
                      setProfilePhotoError(true);
                    }}
                  />
                ) : (
                  <Ionicons name="person" size={24} color="#4A90E2" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.quickActions')}</Text>
          
          <View style={styles.actionsGrid}>
            {/* Start Chat Button */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleNavigate('Chat')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#5BA3F5', '#4A90E2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <MaterialCommunityIcons name="chat-outline" size={32} color="#FFF" />
                <Text style={styles.actionCardText}>{t('home.startChat')}</Text>
                <Text style={styles.actionCardSubtext}>{t('home.talkToAI')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Track Mood Button */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleNavigate('Mood')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#50C878', '#3FAA62']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <MaterialCommunityIcons name="emoticon-happy-outline" size={32} color="#FFF" />
                <Text style={styles.actionCardText}>{t('home.moodInsights')}</Text>
                <Text style={styles.actionCardSubtext}>{t('home.fromAIChats')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mood Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.moodOverview')}</Text>
            <TouchableOpacity onPress={() => handleNavigate('Mood')}>
              <Text style={[styles.seeAllText, { color: theme.primary }]}>{t('home.aiInsights')}</Text>
            </TouchableOpacity>
          </View>

          {moodLoading ? (
            <View style={[styles.moodLoadingCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.moodLoadingText, { color: theme.mutedText }]}>{t('home.loadingMoodInsights')}</Text>
            </View>
          ) : latestMood ? (
            <LinearGradient
              colors={isDark ? ['#222A30', '#20252C', '#1D2329'] : ['#F4FAFF', '#EAF4FF', '#E9F8F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.moodCard}
            >
              <View style={styles.latestMoodRow}>
                <Animated.Text style={[styles.latestMoodEmoji, { transform: [{ scale: moodEmojiAnim }] }]}>
                  {getMoodMeta(latestMood.mood).emoji}
                </Animated.Text>
                <View style={styles.latestMoodTextWrap}>
                  <Text style={[styles.latestMoodTitle, { color: getMoodMeta(latestMood.mood).accent }]}>
                    {t('home.youFelt', { mood: t(getMoodMeta(latestMood.mood).key) })}
                  </Text>
                  <Text style={[styles.latestMoodTime, { color: theme.mutedText }]}>{formatMoodTimestamp(latestMood.createdAt, t)}</Text>
                  <Text style={[styles.latestMoodRelative, { color: theme.mutedText }]}>{getRelativeTime(latestMood.createdAt, t)}</Text>
                </View>
              </View>

              <View style={styles.moodPreviewWrap}>
                {recentMoods.map((item) => {
                  const meta = getMoodMeta(item.mood);
                  return (
                    <View key={item.id} style={[styles.moodPreviewItem, { backgroundColor: meta.soft }]}> 
                      <Text style={styles.moodPreviewEmoji}>{meta.emoji}</Text>
                      <Text style={[styles.moodPreviewLabel, { color: meta.accent }]} numberOfLines={1}>
                        {t(meta.key)}
                      </Text>
                      
                      <Text style={[styles.moodPreviewTime, { color: theme.mutedText }]} numberOfLines={1}>
                        {getRelativeTime(item.createdAt, t)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={[styles.moodTrendCard, { backgroundColor: isDark ? '#252A30' : 'rgba(255,255,255,0.72)' }]}>
                <View style={styles.moodTrendBarsWrap}>
                  {moodTrendData.map((point) => (
                    <View key={point.id} style={styles.moodTrendPoint}>
                      <View style={[styles.moodTrendBar, { height: point.height, backgroundColor: point.meta.accent }]} />
                      <Text style={[styles.moodTrendLabel, { color: theme.mutedText }]}>{point.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.moodInsightText, { color: theme.mutedText }]}>{getMoodInsight(recentMoods, t)}</Text>
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.emptyMoodContainer, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}> 
              <Ionicons name="happy-outline" size={30} color="#6E8EA8" />
              <Text style={[styles.emptyMoodText, { color: theme.text }]}>{t('home.noMoodRecorded')}</Text>
              <Text style={[styles.emptyMoodSubtext, { color: theme.mutedText }]}>{t('home.startChatForMood')}</Text>
              <TouchableOpacity style={styles.moodTrackButton} onPress={() => handleNavigate('Mood')} activeOpacity={0.85}>
                <Text style={styles.moodTrackButtonText}>{t('home.viewAIMoodInsights')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AI Insights Dashboard Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.aiInsights')}</Text>
            <TouchableOpacity onPress={() => loadUserData(true)}>
              <Text style={[styles.seeAllText, { color: theme.primary }]}>{t('home.refresh')}</Text>
            </TouchableOpacity>
          </View>

          {insightsLoading ? (
            <View style={[styles.recentChatsLoadingCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.recentChatsLoadingText, { color: theme.mutedText }]}>{t('home.analyzingTrends')}</Text>
            </View>
          ) : (
            <View style={styles.insightCardStack}>
              {insights.map((insight, index) => (
                <View
                  key={`${insight}-${index}`}
                  style={[styles.insightCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Text style={styles.insightIcon}>💡</Text>
                  <Text style={[styles.insightText, { color: theme.text }]} numberOfLines={2}>
                    {insight}
                  </Text>
                </View>
              ))}

              <View style={[styles.insightTrendPanel, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Text style={[styles.insightTrendTitle, { color: theme.text }]}>{t('home.trendTitle')}</Text>
                <View style={styles.insightTrendBarsWrap}>
                  {insightTrend.map((point) => {
                    const barHeight = Math.max(16, point.value * 12);
                    return (
                      <View key={point.id} style={styles.insightTrendPoint}>
                        <View
                          style={[
                            styles.insightTrendBar,
                            {
                              height: barHeight,
                              backgroundColor: point.value >= 3
                                ? '#3FAF62'
                                : point.value <= 2
                                  ? '#F29C38'
                                  : '#6FAEFF',
                            },
                          ]}
                        />
                        <Text style={[styles.insightTrendLabel, { color: theme.mutedText }]}>{point.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Recent Chats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.recentChats')}</Text>
            <TouchableOpacity onPress={() => handleNavigate('Chat')}>
              <Text style={[styles.seeAllText, { color: theme.primary }]}>{t('home.seeAll')}</Text>
            </TouchableOpacity>
          </View>

          {recentChatsLoading ? (
            <View style={[styles.recentChatsLoadingCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.recentChatsLoadingText, { color: theme.mutedText }]}>{t('home.loadingRecentChats')}</Text>
            </View>
          ) : recentChats.length > 0 ? (
            <View style={[styles.recentChatsCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              {recentChats.map((chat, index) => (
                <Animated.View
                  key={chat.id}
                  style={{
                    opacity: recentChatsAnim.interpolate({
                      inputRange: [0, 0.5 + index * 0.12, 1],
                      outputRange: [0, 0, 1],
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      {
                        translateY: recentChatsAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8 + index * 4, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={styles.activityItem}
                    onPress={() => handleOpenRecentChat(chat)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.activityIcon}>
                      <MaterialCommunityIcons name="robot-happy-outline" size={20} color="#4A90E2" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityPreview, { color: theme.text }]} numberOfLines={1}>
                        {chat.message || t('home.noMessage', { defaultValue: 'No message' })}
                      </Text>
                      <Text style={[styles.activityResponse, { color: theme.mutedText }]} numberOfLines={1}>
                        {chat.response || t('home.noAIResponse', { defaultValue: 'No AI response yet' })}
                      </Text>
                      <View style={styles.chatMoodTagWrap}>
                        <Text style={styles.chatMoodTagText}>
                          {getMoodMeta(chat.detectedMood).emoji} {t(getMoodMeta(chat.detectedMood).key)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.activityMeta}>
                      <Text style={[styles.activityTime, { color: theme.mutedText }]}>{getRelativeTime(chat.createdAt, t)}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#C7D2DE" />
                    </View>
                  </TouchableOpacity>
                  {index < recentChats.length - 1 && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyActivityContainer, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <Text style={[styles.emptyActivityText, { color: theme.text }]}>{t('home.noRecentConversations')}</Text>
              <Text style={[styles.emptyActivitySubtext, { color: theme.mutedText }]}>{t('home.startChatToSeeInteractions')}</Text>
            </View>
          )}
        </View>

        {/* Wellness Tips Section */}
        <View style={[styles.section, styles.sectionLast]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.dailyTip')}</Text>
          
          <View style={[styles.tipCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb" size={28} color="#FFD700" />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: theme.text }]}>{t('home.tipTitle')}</Text>
              <Text style={[styles.tipDescription, { color: theme.mutedText }]}>
                {t('home.tipDescription')}
              </Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  
  // Header Section
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingSection: {
    flex: 1,
    paddingRight: 16,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  subgreeting: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    lineHeight: 20,
  },
  profileButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },

  // Sections
  section: {
    paddingHorizontal: 18,
    marginTop: 28,
  },
  sectionLast: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1C3A5C',
    marginBottom: 16,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '700',
  },

  // Quick Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  actionCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },
  actionCardGradient: {
    paddingVertical: 28,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
  },
  actionCardText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  actionCardSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Mood Card
  moodLoadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  moodLoadingText: {
    color: '#5B7A93',
    fontSize: 13,
    fontWeight: '600',
  },
  moodCard: {
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  latestMoodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  latestMoodEmoji: {
    fontSize: 48,
  },
  latestMoodTextWrap: {
    flex: 1,
  },
  latestMoodTitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  latestMoodTime: {
    fontSize: 13,
    color: '#5E7B92',
    marginTop: 5,
    fontWeight: '600',
  },
  latestMoodRelative: {
    marginTop: 4,
    fontSize: 12,
    color: '#7F97AA',
    fontWeight: '500',
  },
  moodPreviewWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  moodPreviewItem: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  moodPreviewEmoji: {
    fontSize: 24,
  },
  moodPreviewLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  moodPreviewSource: {
    marginTop: 2,
    fontSize: 10,
    color: '#7D95A8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  moodPreviewTime: {
    marginTop: 2,
    fontSize: 11,
    color: '#6D869A',
  },
  moodTrendCard: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  moodTrendBarsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  moodTrendPoint: {
    alignItems: 'center',
    flex: 1,
  },
  moodTrendBar: {
    width: 18,
    borderRadius: 10,
    minHeight: 18,
  },
  moodTrendLabel: {
    marginTop: 5,
    fontSize: 10,
    color: '#6E879A',
    fontWeight: '700',
  },
  moodInsightText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4D6F88',
    fontWeight: '600',
  },
  emptyMoodContainer: {
    backgroundColor: '#EFF6FC',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 18,
  },
  emptyMoodText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#476882',
    marginTop: 12,
  },
  emptyMoodSubtext: {
    fontSize: 13,
    color: '#6C879B',
    marginTop: 6,
    textAlign: 'center',
  },
  moodTrackButton: {
    marginTop: 14,
    backgroundColor: '#2A7FBF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  moodTrackButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Recent Activity
  recentChatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recentChatsLoadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recentChatsLoadingText: {
    color: '#53738D',
    fontSize: 13,
    fontWeight: '600',
  },
  insightCardStack: {
    gap: 10,
  },
  insightCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  insightIcon: {
    fontSize: 18,
    lineHeight: 20,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  insightTrendPanel: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  insightTrendTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  insightTrendBarsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  insightTrendPoint: {
    alignItems: 'center',
    flex: 1,
  },
  insightTrendBar: {
    width: 12,
    borderRadius: 999,
  },
  insightTrendLabel: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: '700',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 0,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E8F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityPreview: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C3A5C',
    lineHeight: 20,
  },
  activityResponse: {
    fontSize: 13,
    color: '#6E859A',
    marginTop: 4,
    lineHeight: 18,
  },
  chatMoodTagWrap: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FC',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chatMoodTagText: {
    fontSize: 11,
    color: '#3E637F',
    fontWeight: '700',
  },
  activityMeta: {
    marginLeft: 10,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  activityTime: {
    fontSize: 12,
    color: '#8DA0B3',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#EEF3F8',
    marginHorizontal: 14,
  },
  emptyActivityContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 28,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyActivityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  emptyActivitySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },

  // Wellness Tip
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#FFD700',
  },
  tipIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FFFAF0',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C3A5C',
    marginBottom: 6,
    lineHeight: 20,
  },
  tipDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    fontWeight: '500',
  },
});

export default HomeScreen;
