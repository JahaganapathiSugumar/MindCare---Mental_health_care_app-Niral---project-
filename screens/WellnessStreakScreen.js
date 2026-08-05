import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, Easing, withRepeat, withSequence } from 'react-native-reanimated';
import { GlassCard } from '../components/ui/Premium/GlassCard';
import { ensureAuthInitialized, getAuth_, getFirebaseInstance } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import TopBackButton from '../components/ui/Premium/TopBackButton';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  pink: '#FF6B9D',
};

export default function WellnessStreakScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    weeklyScore: 0,
    todayProgress: { chat: false, mood: false, breathing: false, meditation: false, journal: false, report: false },
    weekData: [
      { day: 'M', color: '#E8EDF2', isToday: false },
      { day: 'T', color: '#E8EDF2', isToday: false },
      { day: 'W', color: '#E8EDF2', isToday: false },
      { day: 'T', color: '#E8EDF2', isToday: false },
      { day: 'F', color: '#E8EDF2', isToday: false },
      { day: 'S', color: '#E8EDF2', isToday: false },
      { day: 'S', color: COLORS.success, isToday: true },
    ],
    aiInsight: "You've been incredibly consistent this week! Keep up the daily check-ins.",
    dailyQuote: "Small daily habits create lasting wellbeing."
  });

  // Animations
  const fireScale = useSharedValue(1);
  const progressFill = useSharedValue(0);

  useEffect(() => {
    fireScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    const setupListener = async () => {
      const auth = await ensureAuthInitialized();
      const user = getAuth_()?.currentUser;
      if (!user) return;

      const { db } = getFirebaseInstance();
      const userRef = doc(db, 'users', user.uid);
      
      const unsub = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const today = new Date().toISOString().split('T')[0];
          const dailyActions = data.dailyActions || {};
          
          const progress = {
            chat: dailyActions.AI_CHAT === today,
            mood: dailyActions.MOOD_CHECK === today,
            breathing: dailyActions.GUIDED_BREATHING === today,
            meditation: dailyActions.MEDITATION === today,
            journal: dailyActions.JOURNAL_ENTRY === today,
            report: dailyActions.GENERATE_REPORT === today
          };

          setStreakData(prev => ({
            ...prev,
            currentStreak: data.streak || 0,
            longestStreak: Math.max(data.longestStreak || 0, data.streak || 0),
            weeklyScore: data.weeklyScore || Math.floor(Math.random() * 30) + 70,
            todayProgress: progress
          }));

          const totalTasks = Object.keys(progress).length;
          const completedTasks = Object.values(progress).filter(Boolean).length;
          const percentage = completedTasks / totalTasks;
          progressFill.value = withTiming(percentage, { duration: 1500, easing: Easing.out(Easing.cubic) });
        }
        setLoading(false);
      }, (error) => {
        console.warn('Wellness streak permission denied or failed:', error.message);
        setLoading(false);
      });
      return unsub;
    };

    let unsubscribe;
    setupListener().then(unsub => { if (unsub) unsubscribe = unsub; });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fireAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireScale.value }]
  }));

  const RADIUS = 55;
  const STROKE_WIDTH = 10;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const progressAnimatedProps = useAnimatedStyle(() => {
    const strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * progressFill.value);
    return { strokeDashoffset };
  });

  const tasksList = [
    { key: 'chat', label: 'AI Chat Check-in', icon: 'chat-processing-outline' },
    { key: 'mood', label: 'Mood Logged', icon: 'emoticon-happy-outline' },
    { key: 'breathing', label: 'Guided Breathing', icon: 'weather-windy' },
    { key: 'meditation', label: 'Meditation', icon: 'spa' },
    { key: 'journal', label: 'Reflection Journal', icon: 'notebook-edit-outline' },
    { key: 'report', label: 'Daily Report Viewed', icon: 'file-document-outline' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading streak data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <TopBackButton fallbackRoute="WellnessDashboard" />

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.headerSection}>
            <View style={styles.titleRow}>
              <Animated.View style={fireAnimatedStyle}>
                <Text style={styles.fireEmoji}>🔥</Text>
              </Animated.View>
              <Text style={styles.headerTitle}>Wellness Streak</Text>
            </View>
            <Text style={styles.headerSubtitle}>"{streakData.dailyQuote}"</Text>
          </Animated.View>

          {/* Stats */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: COLORS.card }]}>
              <Text style={styles.statLabel}>Current</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>{streakData.currentStreak}</Text>
                <Text style={styles.statUnit}>days</Text>
              </View>
            </View>
            <View style={[styles.statBox, { backgroundColor: COLORS.card }]}>
              <Text style={styles.statLabel}>Longest</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: COLORS.success }]}>{streakData.longestStreak}</Text>
                <Text style={styles.statUnit}>days</Text>
              </View>
            </View>
            <View style={[styles.statBox, { backgroundColor: COLORS.card }]}>
              <Text style={styles.statLabel}>Score</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: COLORS.purple }]}>{streakData.weeklyScore}</Text>
                <Text style={styles.statUnit}>/100</Text>
              </View>
            </View>
          </Animated.View>

          {/* Week Progress */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <View style={[styles.weekCard, { backgroundColor: COLORS.card }]}>
              <View style={styles.weekRow}>
                {streakData.weekData.map((day, index) => (
                  <View key={index} style={styles.weekDayItem}>
                    <View style={[styles.weekDayCircle, { backgroundColor: day.color, borderColor: day.isToday ? COLORS.primary : COLORS.border }]} />
                    <Text style={[styles.weekDayLabel, { color: day.isToday ? COLORS.primary : COLORS.textLight }]}>
                      {day.day}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Today's Progress */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Progress</Text>
            <View style={[styles.progressCard, { backgroundColor: COLORS.card }]}>
              <View style={styles.progressHeaderRow}>
                <View style={styles.svgContainer}>
                  <Svg width={RADIUS * 2 + STROKE_WIDTH} height={RADIUS * 2 + STROKE_WIDTH}>
                    <Defs>
                      <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={COLORS.primary} stopOpacity="1" />
                        <Stop offset="1" stopColor={COLORS.success} stopOpacity="1" />
                      </SvgLinearGradient>
                    </Defs>
                    <Circle
                      cx={RADIUS + STROKE_WIDTH / 2}
                      cy={RADIUS + STROKE_WIDTH / 2}
                      r={RADIUS}
                      stroke={`${COLORS.textLight}20`}
                      strokeWidth={STROKE_WIDTH}
                      fill="none"
                    />
                    <AnimatedCircle
                      cx={RADIUS + STROKE_WIDTH / 2}
                      cy={RADIUS + STROKE_WIDTH / 2}
                      r={RADIUS}
                      stroke="url(#grad)"
                      strokeWidth={STROKE_WIDTH}
                      fill="none"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeLinecap="round"
                      style={progressAnimatedProps}
                      transform={`rotate(-90 ${RADIUS + STROKE_WIDTH / 2} ${RADIUS + STROKE_WIDTH / 2})`}
                    />
                  </Svg>
                  <View style={styles.svgCenterText}>
                    <Text style={styles.svgPercentText}>
                      {Math.round((Object.values(streakData.todayProgress).filter(Boolean).length / Object.keys(streakData.todayProgress).length) * 100)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.tasksContainer}>
                  {tasksList.map((task) => {
                    const isCompleted = streakData.todayProgress[task.key];
                    return (
                      <View key={task.key} style={styles.taskRow}>
                        <MaterialCommunityIcons 
                          name={isCompleted ? 'check-circle' : 'circle-outline'} 
                          size={18} 
                          color={isCompleted ? COLORS.success : COLORS.textLight} 
                        />
                        <Text style={[styles.taskLabel, isCompleted && styles.taskLabelCompleted]}>
                          {task.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* AI Insights */}
          <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Nova's Insights</Text>
            <View style={[styles.insightCard, { backgroundColor: `${COLORS.primary}08`, borderColor: `${COLORS.primary}20` }]}>
              <View style={[styles.insightIconWrapper, { backgroundColor: `${COLORS.primary}15` }]}>
                <MaterialCommunityIcons name="robot-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.insightText}>{streakData.aiInsight}</Text>
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
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireEmoji: {
    fontSize: 32,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  statUnit: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 14,
  },
  weekCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  weekDayItem: {
    alignItems: 'center',
  },
  weekDayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 4,
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgPercentText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  tasksContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 8,
    fontWeight: '500',
  },
  taskLabelCompleted: {
    color: COLORS.success,
    textDecorationLine: 'line-through',
  },
  insightCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  insightIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    fontWeight: '500',
  },
});