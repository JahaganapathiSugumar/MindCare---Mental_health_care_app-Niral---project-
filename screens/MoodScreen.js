import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { addXP, XP_REWARDS } from '../services/xpService';
import { getAuth_, getFirebaseInstance } from '../firebase';
import { collection, query, orderBy, limit, getDocs, where, onSnapshot } from 'firebase/firestore';
import TopBackButton from '../components/ui/Premium/TopBackButton';
import MoodOverviewGraph from '../components/ui/Premium/MoodOverviewGraph';
import { DeviceEventEmitter } from 'react-native';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

// Light color scheme
const COLORS = {
  background: '#F0F4F8',
  card: '#FFFFFF',
  primary: '#4A90D9',
  secondary: '#6C63FF',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E8EDF2',
  shadow: 'rgba(0,0,0,0.06)',
};

export default function MoodScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [graphMoods, setGraphMoods] = useState([]);
  const [moodStats, setMoodStats] = useState({
    averageMood: 'Neutral',
    bestDay: 'N/A',
    lowestDay: 'N/A',
    stability: 'N/A',
    distribution: { happy: 0, neutral: 0, sad: 0, anxious: 0 },
    totalEntries: 0,
    streak: 0
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [unsubscribeListener, setUnsubscribeListener] = useState(null);

  useEffect(() => {
    fetchMoodData();
    setupRealtimeListener();
    
    const subscription = DeviceEventEmitter.addListener('moodUpdated', (data) => {
      console.log('[MoodScreen] Mood update received from chat:', data);
      fetchMoodData();
    });
    
    return () => {
      if (unsubscribeListener) {
        unsubscribeListener();
      }
      subscription.remove();
    };
  }, []);

  const setupRealtimeListener = () => {
    try {
      const { db } = getFirebaseInstance();
      const currentUser = getAuth_()?.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const moodsRef = collection(db, 'moods');
      const q = query(moodsRef, where('userId', '==', currentUser.uid));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const moods = [];
        snapshot.forEach(doc => {
          moods.push({ id: doc.id, ...doc.data() });
        });
        
        moods.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        
        if (moods.length > 0) {
          processMoodData(moods);
          setLastUpdated(new Date());
        } else {
          setGraphMoods([]);
          setMoodStats({
            averageMood: 'Neutral',
            bestDay: 'N/A',
            lowestDay: 'N/A',
            stability: 'N/A',
            distribution: { happy: 0, neutral: 0, sad: 0, anxious: 0 },
            totalEntries: 0,
            streak: 0
          });
          setLoading(false);
          setRefreshing(false);
        }
      }, (error) => {
        console.error('Error listening to mood updates:', error);
        setLoading(false);
      });
      
      setUnsubscribeListener(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up listener:', error);
      setLoading(false);
    }
  };

  const processMoodData = (moodsData) => {
    const distribution = { happy: 0, neutral: 0, sad: 0, anxious: 0 };
    const dayStats = {};
    const scores = [];
    const recentGraphData = [];
    let totalScore = 0;
    let count = 0;
    
    const sortedMoods = [...moodsData].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
    
    let streak = 0;
    let lastDate = null;
    let streakBreak = false;
    
    for (let i = 0; i < sortedMoods.length; i++) {
      const data = sortedMoods[i];
      const mood = (data.mood || 'neutral').toLowerCase();
      
      if (i < 30) {
        recentGraphData.push({ ...data });
      }

      if (distribution[mood] !== undefined) {
        distribution[mood]++;
        count++;
        let s = 3;
        if (mood === 'happy') s = 4;
        else if (mood === 'neutral') s = 3;
        else if (mood === 'anxious') s = 2;
        else if (mood === 'sad') s = 1;
        totalScore += s;
        scores.push(s);

        const date = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
        const day = date.getDay();
        if (!dayStats[day]) dayStats[day] = { count: 0, score: 0 };
        dayStats[day].count += 1;
        dayStats[day].score += s;
        
        if (!streakBreak) {
          const today = new Date();
          const entryDate = new Date(date);
          entryDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          
          if (!lastDate) {
            lastDate = entryDate;
            streak = 1;
          } else {
            const diffDays = Math.floor((lastDate - entryDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
              // Same day
            } else if (diffDays === 1) {
              streak++;
              lastDate = entryDate;
            } else {
              streakBreak = true;
            }
          }
        }
      }
    }

    let averageStr = 'Neutral';
    let bestDayStr = 'N/A';
    let lowestDayStr = 'N/A';
    let stabilityStr = 'N/A';

    if (count > 0) {
      const avg = totalScore / count;
      if (avg >= 3.5) averageStr = 'Happy';
      else if (avg >= 2.5) averageStr = 'Neutral';
      else if (avg >= 1.5) averageStr = 'Anxious';
      else averageStr = 'Sad';

      const days = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
      if (Object.keys(dayStats).length > 0) {
        let highestAvg = -1;
        let lowestAvg = 5;
        let bestD = 0;
        let lowestD = 0;
        Object.keys(dayStats).forEach(day => {
          const dAvg = dayStats[day].score / dayStats[day].count;
          if (dAvg > highestAvg) { highestAvg = dAvg; bestD = day; }
          if (dAvg < lowestAvg) { lowestAvg = dAvg; lowestD = day; }
        });
        bestDayStr = days[bestD] || 'N/A';
        lowestDayStr = days[lowestD] || 'N/A';
      }

      if (count > 1) {
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / count;
        if (variance > 1.5) stabilityStr = 'Low';
        else if (variance > 0.8) stabilityStr = 'Medium';
        else stabilityStr = 'High';
      }
    }

    setGraphMoods(recentGraphData);
    setMoodStats({
      averageMood: averageStr,
      bestDay: bestDayStr,
      lowestDay: lowestDayStr,
      stability: stabilityStr,
      distribution,
      totalEntries: count,
      streak: streak
    });
    setLoading(false);
    setRefreshing(false);
  };

  const fetchMoodData = async () => {
    try {
      const { db } = getFirebaseInstance();
      const currentUser = getAuth_()?.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const moodsRef = collection(db, 'moods');
      const q = query(moodsRef, where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      
      const moods = [];
      snapshot.forEach(doc => {
        moods.push({ id: doc.id, ...doc.data() });
      });
      
      moods.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      
      if (moods.length > 0) {
        processMoodData(moods);
        setLastUpdated(new Date());
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.warn('Error fetching mood data:', error);
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMoodData();
  }, []);

  const getMoodEmoji = (mood) => {
    const emojis = {
      happy: '😊',
      neutral: '😐',
      anxious: '😰',
      sad: '😢'
    };
    return emojis[mood?.toLowerCase()] || '😐';
  };

  const renderDistributionBar = (label, count, max, color, emoji) => {
    const percentage = max > 0 ? (count / max) * 100 : 0;
    return (
      <View style={styles.distRow}>
        <View style={styles.distLabelContainer}>
          <Text style={styles.distEmoji}>{emoji}</Text>
          <Text style={styles.distLabel}>{label}</Text>
        </View>
        <View style={styles.distTrack}>
          <View style={[styles.distFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.distCount}>{count}</Text>
      </View>
    );
  };

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('mood.loading', { defaultValue: 'Loading mood data...' })}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <TopBackButton fallbackRoute="WellnessDashboard" />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)}>
            <View style={styles.headerContainer}>
              <View>
                <Text style={{height:30}}></Text>
                <Text style={styles.title}>{t('mood.title', { defaultValue: '📊 Mood Analytics' })}</Text>
                <Text style={styles.subtitle}>{t('mood.subtitle', { defaultValue: 'Track your emotional well-being' })}</Text>
              </View>
              {lastUpdated && (
                <View style={styles.lastUpdated}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color={COLORS.textLight} />
                  <Text style={styles.lastUpdatedText}>{t('mood.updated', { time: formatTime(lastUpdated), defaultValue: `Updated ${formatTime(lastUpdated)}` })}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Stats Cards Row */}
          <View style={styles.statsRow}>
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.statsCard}>
              <View style={[styles.statsIconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                <MaterialCommunityIcons name="emoticon-happy-outline" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.statsCardLabel}>{t('mood.currentMood', { defaultValue: 'Current Mood' })}</Text>
              <Text style={styles.statsCardValue}>
                {getMoodEmoji(moodStats.averageMood)} {moodStats.averageMood}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.statsCard}>
              <View style={[styles.statsIconContainer, { backgroundColor: `${COLORS.success}15` }]}>
                <MaterialCommunityIcons name="fire" size={22} color={COLORS.success} />
              </View>
              <Text style={styles.statsCardLabel}>{t('mood.streak', { defaultValue: 'Streak' })}</Text>
              <Text style={styles.statsCardValue}>{moodStats.streak} {t('mood.days', { defaultValue: 'days' })}</Text>
            </Animated.View>
          </View>

          {/* Total Entries */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.entriesCard}>
            <MaterialCommunityIcons name="calendar-check" size={18} color={COLORS.primary} />
            <Text style={styles.entriesText}>
              {moodStats.totalEntries} {t('mood.entriesRecorded', { defaultValue: 'mood entries recorded' })}
            </Text>
          </Animated.View>

          {/* AI Summary */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <View style={styles.aiIconContainer}>
                  <MaterialCommunityIcons name="robot-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.aiTitle}>{t('mood.aiSummaryTitle', { defaultValue: 'AI Mood Summary' })}</Text>
              </View>
              <Text style={styles.aiText}>
                {t('mood.aiSummaryText', { 
                  average: moodStats.averageMood.toLowerCase(), 
                  best: moodStats.bestDay !== 'N/A' ? moodStats.bestDay : '', 
                  stability: moodStats.stability !== 'N/A' ? moodStats.stability.toLowerCase() : '',
                  streak: moodStats.streak,
                  defaultValue: `Your mood has been generally ${moodStats.averageMood.toLowerCase()}. ${moodStats.bestDay !== 'N/A' ? `You tend to feel best on ${moodStats.bestDay}s.` : ''} ${moodStats.stability !== 'N/A' ? `Your mood stability is ${moodStats.stability.toLowerCase()}.` : ''} ${moodStats.streak > 0 ? `You've been tracking for ${moodStats.streak} days in a row!` : ''}`
                })}
              </Text>
            </View>
          </Animated.View>

          {/* Mood Graph */}
          <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.graphContainer}>
            <MoodOverviewGraph moods={graphMoods} />
          </Animated.View>

          {/* Best/Worst Day Cards */}
          <View style={styles.bestWorstRow}>
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={[styles.bestWorstCard, { borderColor: COLORS.success, backgroundColor: `${COLORS.success}08` }]}>
              <MaterialCommunityIcons name="trending-up" size={20} color={COLORS.success} />
              <Text style={styles.bestWorstLabel}>{t('mood.bestDay', { defaultValue: 'Best Day' })}</Text>
              <Text style={[styles.bestWorstValue, { color: COLORS.success }]}>{moodStats.bestDay}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={[styles.bestWorstCard, { borderColor: COLORS.danger, backgroundColor: `${COLORS.danger}08` }]}>
              <MaterialCommunityIcons name="trending-down" size={20} color={COLORS.danger} />
              <Text style={styles.bestWorstLabel}>{t('mood.lowestDay', { defaultValue: 'Lowest Day' })}</Text>
              <Text style={[styles.bestWorstValue, { color: COLORS.danger }]}>{moodStats.lowestDay}</Text>
            </Animated.View>
          </View>

          {/* Distribution */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            <View style={styles.distCard}>
              <Text style={styles.sectionTitle}>{t('mood.emotionDist', { defaultValue: 'Emotion Distribution' })}</Text>
              {renderDistributionBar(t('mood.happy', { defaultValue: 'Happy' }), moodStats.distribution.happy, 30, COLORS.success, '😊')}
              {renderDistributionBar(t('mood.neutral', { defaultValue: 'Neutral' }), moodStats.distribution.neutral, 30, COLORS.warning, '😐')}
              {renderDistributionBar(t('mood.anxious', { defaultValue: 'Anxious' }), moodStats.distribution.anxious, 30, '#E67E22', '😰')}
              {renderDistributionBar(t('mood.sad', { defaultValue: 'Sad' }), moodStats.distribution.sad, 30, COLORS.danger, '😢')}
            </View>
          </Animated.View>

          {/* Stability Card */}
          <Animated.View entering={FadeInDown.delay(500).duration(600)}>
            <View style={styles.stabilityCard}>
              <View style={styles.stabilityHeader}>
                <MaterialCommunityIcons name="scale-balance" size={22} color={COLORS.primary} />
                <Text style={styles.stabilityTitle}>{t('mood.stability', { defaultValue: 'Mood Stability' })}</Text>
              </View>
              <View style={styles.stabilityContent}>
                <Text style={[styles.stabilityValue, { 
                  color: moodStats.stability === 'High' ? COLORS.success : 
                         moodStats.stability === 'Medium' ? COLORS.warning : COLORS.danger 
                }]}>
                  {moodStats.stability === 'High' ? t('mood.high', { defaultValue: 'High' }) : moodStats.stability === 'Medium' ? t('mood.medium', { defaultValue: 'Medium' }) : t('mood.low', { defaultValue: 'Low' })}
                </Text>
                <View style={styles.stabilityBar}>
                  <View style={[styles.stabilityFill, { 
                    width: moodStats.stability === 'High' ? '80%' : 
                           moodStats.stability === 'Medium' ? '50%' : '20%',
                    backgroundColor: moodStats.stability === 'High' ? COLORS.success : 
                                    moodStats.stability === 'Medium' ? COLORS.warning : COLORS.danger
                  }]} />
                </View>
                <Text style={styles.stabilityLabel}>
                  {moodStats.stability === 'High' ? t('mood.stableDesc', { defaultValue: 'Your mood is consistent and stable' }) :
                   moodStats.stability === 'Medium' ? t('mood.moderateDesc', { defaultValue: 'Your mood varies moderately' }) :
                   t('mood.fluctuatesDesc', { defaultValue: 'Your mood fluctuates significantly' })}
                </Text>
              </View>
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.textLight}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lastUpdatedText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statsCardLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  statsCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  entriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}08`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  entriesText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  aiCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  aiIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  aiText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 22,
  },
  graphContainer: {
    marginBottom: 16,
  },
  bestWorstRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  bestWorstCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bestWorstLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  bestWorstValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  distCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 14,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  distLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    gap: 6,
  },
  distEmoji: {
    fontSize: 14,
  },
  distLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  distTrack: {
    flex: 1,
    height: 6,
    backgroundColor: `${COLORS.textLight}15`,
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    borderRadius: 3,
  },
  distCount: {
    width: 24,
    textAlign: 'right',
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  stabilityCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stabilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  stabilityContent: {
    alignItems: 'center',
  },
  stabilityValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  stabilityBar: {
    width: '100%',
    height: 4,
    backgroundColor: `${COLORS.textLight}15`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stabilityFill: {
    height: '100%',
    borderRadius: 2,
  },
  stabilityLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
});