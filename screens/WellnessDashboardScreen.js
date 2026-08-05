import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getFirebaseInstance, getAuth_ } from '../firebase';
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { FloatingBottomNav } from '../components/ui/Premium/LearningHubCards';
import TopBackButton from '../components/ui/Premium/TopBackButton';
import LevelProgressBar from '../components/ui/Premium/LevelProgressBar';
import TimelineCard from '../components/ui/Premium/TimelineCard';
import { calculateLevelAndProgress } from '../services/gamificationService';
import { useTranslation } from 'react-i18next';

// Light color scheme
const COLORS = {
  background: '#F0F4F8',
  card: '#FFFFFF',
  primary: '#4A90D9',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E8EDF2',
  shadow: 'rgba(0,0,0,0.06)',
  gold: '#F1C40F',
  purple: '#8E44AD',
  accent: '#E67E22',
};

export default function WellnessDashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const [userData, setUserData] = useState({
    name: 'User',
    level: 1,
    totalXP: 0,
    currentXP: 0,
    xpNeededForNextLevel: 100,
    progress: 0,
    streak: 0,
    weeklyScore: 0,
    todayScore: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const { db } = getFirebaseInstance();
    const currentUser = getAuth_()?.currentUser;
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const totalXP = data.totalXP || 0;
        const levelData = calculateLevelAndProgress(totalXP);

        setUserData(prev => ({
          ...prev,
          name: data.fullName?.split(' ')[0] || data.email?.split('@')[0] || 'User',
          level: levelData.level,
          totalXP: levelData.totalXP,
          currentXP: levelData.currentLevelXP,
          xpNeededForNextLevel: levelData.xpNeededForNextLevel,
          progress: levelData.progress,
          streak: data.streak || 0,
          todayScore: data.todayScore || Math.floor(Math.random() * 40) + 60,
          weeklyScore: data.weeklyScore || Math.floor(Math.random() * 30) + 70,
        }));
      }
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.warn('User permission denied or failed:', error.message);
      setLoading(false);
      setRefreshing(false);
    });

    const activityRef = collection(db, `users/${currentUser.uid}/activityFeed`);
    const q = query(activityRef, orderBy('timestamp', 'desc'), limit(3));
    const unsubscribeActivity = onSnapshot(q, (snapshot) => {
      const activities = [];
      snapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });
      setRecentActivity(activities);
    }, (error) => {
      console.warn('Activity feed permission denied or failed:', error.message);
    });

    return () => {
      unsubscribeUser();
      unsubscribeActivity();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Data will refresh via listeners
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning', { defaultValue: 'Good Morning' });
    if (hour < 17) return t('dashboard.goodAfternoon', { defaultValue: 'Good Afternoon' });
    return t('dashboard.goodEvening', { defaultValue: 'Good Evening' });
  };

  const getMoodEmoji = (score) => {
    if (score >= 80) return '😊';
    if (score >= 60) return '😐';
    if (score >= 40) return '😰';
    return '😢';
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <TopBackButton fallbackRoute="Home" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={{height:30}}></Text>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.name}>{userData.name} 👋</Text>
              </View>
              <TouchableOpacity
                style={styles.profilePicPlaceholder}
                onPress={() => navigation.navigate('Profile')}
              >
                <MaterialCommunityIcons name="account" size={28} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statChip, { backgroundColor: `${COLORS.success}10`, borderColor: `${COLORS.success}20` }]}>
                <MaterialCommunityIcons name="fire" color={COLORS.success} size={16} />
                <Text style={[styles.statText, { color: COLORS.success }]}>{userData.streak} {t('dashboard.dayStreak', { defaultValue: 'Day Streak' })}</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: `${COLORS.primary}10`, borderColor: `${COLORS.primary}20` }]}>
                <MaterialCommunityIcons name="star" color={COLORS.primary} size={16} />
                <Text style={[styles.statText, { color: COLORS.primary }]}>{t('dashboard.level', { defaultValue: 'Level' })} {userData.level}</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: `${COLORS.warning}10`, borderColor: `${COLORS.warning}20` }]}>
                <MaterialCommunityIcons name="trophy" color={COLORS.warning} size={16} />
                <Text style={[styles.statText, { color: COLORS.warning }]}>{userData.totalXP} {t('dashboard.xp', { defaultValue: 'XP' })}</Text>
              </View>
            </View>

            {/* Level Progress Card */}
            <View style={styles.levelCard}>
              <LevelProgressBar
                level={userData.level}
                currentXP={userData.currentXP}
                totalXP={userData.totalXP}
                xpNeededForNextLevel={userData.xpNeededForNextLevel}
                progress={userData.progress}
              />
            </View>
          </Animated.View>

          {/* Daily Wellness Rings */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <View style={styles.progressCard}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="chart-pie" size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>{t('dashboard.dailyWellness', { defaultValue: 'Daily Wellness' })}</Text>
              </View>
              <View style={styles.ringsContainer}>
                <View style={styles.ringWrapper}>
                  <View style={styles.ringCircle}>
                    <View style={[styles.ringBackground, { borderColor: COLORS.primary }]}>
                      <Text style={[styles.ringPercentage, { color: COLORS.primary }]}>
                        {Math.round(userData.todayScore / 100 * 100)}%
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="emoticon-happy" size={20} color={COLORS.primary} />
                  <Text style={styles.ringLabel}>{t('dashboard.mood', { defaultValue: 'Mood' })}</Text>
                </View>

                <View style={styles.ringWrapper}>
                  <View style={styles.ringCircle}>
                    <View style={[styles.ringBackground, { borderColor: COLORS.purple }]}>
                      <Text style={[styles.ringPercentage, { color: COLORS.purple }]}>
                        {Math.min(100, Math.round(userData.currentXP / 50 * 100))}%
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="brain" size={20} color={COLORS.purple} />
                  <Text style={styles.ringLabel}>{t('dashboard.mind', { defaultValue: 'Mind' })}</Text>
                </View>

                <View style={styles.ringWrapper}>
                  <View style={styles.ringCircle}>
                    <View style={[styles.ringBackground, { borderColor: COLORS.success }]}>
                      <Text style={[styles.ringPercentage, { color: COLORS.success }]}>
                        {userData.streak > 0 ? '100%' : '0%'}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="leaf" size={20} color={COLORS.success} />
                  <Text style={styles.ringLabel}>{t('dashboard.body', { defaultValue: 'Body' })}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Recent Activity Timeline */}
          {recentActivity.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(600)}>
              <View style={styles.timelineCard}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>{t('dashboard.recentActivity', { defaultValue: 'Recent Activity' })}</Text>
                </View>
                {recentActivity.map((item, index) => (
                  <TimelineCard
                    key={item.id}
                    item={item}
                    index={index}
                    isLast={index === recentActivity.length - 1}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Quick Access Grid */}
          <View style={styles.gridContainer}>
            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.gridItem}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('AchievementGallery')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.gold}15` }]}>
                  <MaterialCommunityIcons name="trophy-award" size={28} color={COLORS.gold} />
                </View>
                <Text style={styles.actionCardTitle}>{t('dashboard.achievements', { defaultValue: 'Achievements' })}</Text>
                <Text style={styles.actionCardSubtitle}>{t('dashboard.viewUnlocked', { defaultValue: 'View Unlocked' })}</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.gridItem}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('Leaderboard')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.primary}15` }]}>
                  <MaterialCommunityIcons name="podium" size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.actionCardTitle}>{t('dashboard.leaderboard', { defaultValue: 'Leaderboard' })}</Text>
                <Text style={styles.actionCardSubtitle}>{t('dashboard.globalRank', { defaultValue: 'Global Rank' })}</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.gridItem}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('Heatmap')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.accent}15` }]}>
                  <MaterialCommunityIcons name="calendar-month" size={28} color={COLORS.accent} />
                </View>
                <Text style={styles.actionCardTitle}>{t('dashboard.heatmap', { defaultValue: 'Heatmap' })}</Text>
                <Text style={styles.actionCardSubtitle}>{t('dashboard.activityLog', { defaultValue: 'Activity Log' })}</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.gridItem}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('Mood')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.success}15` }]}>
                  <MaterialCommunityIcons name="chart-timeline-variant" size={28} color={COLORS.success} />
                </View>
                <Text style={styles.actionCardTitle}>{t('dashboard.analytics', { defaultValue: 'Analytics' })}</Text>
                <Text style={styles.actionCardSubtitle}>{t('dashboard.moodReports', { defaultValue: 'Mood & Reports' })}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        <FloatingBottomNav
          activeTab="WellnessDashboard"
          onTabPress={(tab) => navigation.navigate(tab)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  profilePicPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  levelCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressCard: {
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
  timelineCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  ringsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  ringWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  ringCircle: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringBackground: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  ringPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  ringLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47%',
  },
  actionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 110,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
});