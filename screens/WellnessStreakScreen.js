import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, Easing, withRepeat, withSequence } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { getWellnessStreakData } from '../services/streakService';
import { ensureAuthInitialized, getAuth_ } from '../firebase';

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function WellnessStreakScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState(null);

  // Animations
  const fireScale = useSharedValue(1);
  const progressFill = useSharedValue(0);

  useEffect(() => {
    loadData();

    // Fire breathing animation
    fireScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const loadData = async () => {
    try {
      const auth = await ensureAuthInitialized();
      const user = getAuth_()?.currentUser;
      if (user) {
        const data = await getWellnessStreakData(user.uid);
        setStreakData(data);
        
        // Calculate progress percentage
        if (data && data.todayProgress) {
          const totalTasks = Object.keys(data.todayProgress).length;
          const completedTasks = Object.values(data.todayProgress).filter(Boolean).length;
          const percentage = completedTasks / totalTasks;
          
          setTimeout(() => {
            progressFill.value = withTiming(percentage, { duration: 1500, easing: Easing.out(Easing.cubic) });
          }, 500);
        }
      }
    } catch (e) {
      console.warn('Error loading streak data', e);
    } finally {
      setLoading(false);
    }
  };

  const fireAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: fireScale.value }]
    };
  });

  // Progress Ring Logic
  const RADIUS = 60;
  const STROKE_WIDTH = 12;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const progressAnimatedProps = useAnimatedStyle(() => {
    const strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * progressFill.value);
    return {
      strokeDashoffset,
    };
  });

  if (loading || !streakData) {
    return (
      <SafeAreaView style={[styles.container, styles.centerAll]}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Loading wellness journey...</Text>
      </SafeAreaView>
    );
  }

  const tasksList = [
    { key: 'chat', label: 'AI Chat Check-in', icon: 'chat-processing-outline' },
    { key: 'mood', label: 'Mood Logged', icon: 'emoticon-happy-outline' },
    { key: 'breathing', label: 'Guided Breathing', icon: 'weather-windy' },
    { key: 'meditation', label: 'Meditation', icon: 'spa' },
    { key: 'journal', label: 'Reflection Journal', icon: 'notebook-edit-outline' },
    { key: 'report', label: 'Daily Report Viewed', icon: 'file-document-outline' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backNav} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#E2E8F0" />
          <Text style={styles.backNavText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Animated.View style={fireAnimatedStyle}>
              <Text style={styles.fireEmoji}>🔥</Text>
            </Animated.View>
            <Text style={styles.headerTitle}>Wellness Streak</Text>
          </View>
          <Text style={styles.headerSubtitle}>"Small daily habits create lasting wellbeing."</Text>
        </Animated.View>

        {/* Top Stats Cards */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.statsRow}>
          <View style={styles.statBox}>
            <LinearGradient colors={['rgba(96, 165, 250, 0.15)', 'rgba(96, 165, 250, 0.02)']} style={styles.statGradient}>
              <Text style={styles.statLabel}>Current</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{streakData.currentStreak}</Text>
                <Text style={styles.statUnit}>days</Text>
              </View>
            </LinearGradient>
          </View>
          <View style={styles.statBox}>
            <LinearGradient colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.02)']} style={styles.statGradient}>
              <Text style={styles.statLabel}>Longest</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{streakData.longestStreak}</Text>
                <Text style={styles.statUnit}>days</Text>
              </View>
            </LinearGradient>
          </View>
          <View style={styles.statBox}>
            <LinearGradient colors={['rgba(167, 139, 250, 0.15)', 'rgba(167, 139, 250, 0.02)']} style={styles.statGradient}>
              <Text style={styles.statLabel}>Score</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{streakData.weeklyScore}</Text>
                <Text style={styles.statUnit}>/100</Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Weekly Calendar */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Calendar</Text>
          <View style={styles.calendarCard}>
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} style={styles.calendarGradient}>
              {streakData.weekData.map((day, index) => (
                <View key={index} style={styles.calendarDayCol}>
                  <Text style={[styles.calendarDayText, day.isToday && styles.calendarDayTextActive]}>{day.day}</Text>
                  <View style={[styles.calendarDot, { backgroundColor: day.color }, day.isToday && styles.calendarDotToday]} />
                </View>
              ))}
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Today's Progress */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.progressCard}>
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} style={styles.progressGradient}>
              
              <View style={styles.progressHeaderRow}>
                {/* SVG Progress Ring */}
                <View style={styles.svgContainer}>
                  <Svg width={RADIUS * 2 + STROKE_WIDTH} height={RADIUS * 2 + STROKE_WIDTH}>
                    <Defs>
                      <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor="#60A5FA" stopOpacity="1" />
                        <Stop offset="1" stopColor="#69F0AE" stopOpacity="1" />
                      </SvgLinearGradient>
                    </Defs>
                    {/* Background Ring */}
                    <Circle
                      cx={RADIUS + STROKE_WIDTH / 2}
                      cy={RADIUS + STROKE_WIDTH / 2}
                      r={RADIUS}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={STROKE_WIDTH}
                      fill="none"
                    />
                    {/* Foreground Ring */}
                    <AnimatedCircle
                      cx={RADIUS + STROKE_WIDTH / 2}
                      cy={RADIUS + STROKE_WIDTH / 2}
                      r={RADIUS}
                      stroke="url(#grad)"
                      strokeWidth={STROKE_WIDTH}
                      fill="none"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={CIRCUMFERENCE}
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

                {/* Tasks Checklist */}
                <View style={styles.tasksContainer}>
                  {tasksList.map((task) => {
                    const isCompleted = streakData.todayProgress[task.key];
                    return (
                      <View key={task.key} style={styles.taskRow}>
                        <MaterialCommunityIcons 
                          name={isCompleted ? 'check-circle' : 'circle-outline'} 
                          size={20} 
                          color={isCompleted ? '#69F0AE' : 'rgba(255,255,255,0.2)'} 
                        />
                        <Text style={[styles.taskLabel, isCompleted && styles.taskLabelCompleted]}>{task.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

            </LinearGradient>
          </View>
        </Animated.View>

        {/* AI Insights */}
        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>Nova's Insights</Text>
          <View style={styles.insightCard}>
            <View style={styles.insightIconWrapper}>
              <MaterialCommunityIcons name="robot-outline" size={24} color="#60A5FA" />
            </View>
            <Text style={styles.insightText}>{streakData.aiInsight}</Text>
          </View>
        </Animated.View>

        {/* Achievements */}
        <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
            {streakData.achievements.map((badge) => (
              <View key={badge.id} style={[styles.badgeCard, !badge.unlocked && styles.badgeLocked]}>
                <View style={[styles.badgeIconBg, { backgroundColor: badge.unlocked ? `${badge.color}20` : 'rgba(255,255,255,0.05)' }]}>
                  <MaterialCommunityIcons 
                    name={badge.unlocked ? badge.icon : 'lock-outline'} 
                    size={32} 
                    color={badge.unlocked ? badge.color : 'rgba(255,255,255,0.2)'} 
                  />
                </View>
                <Text style={[styles.badgeTitle, !badge.unlocked && { color: '#64748B' }]} numberOfLines={2}>
                  {badge.title}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Daily Quote */}
        <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.quoteSection}>
          <MaterialCommunityIcons name="format-quote-open" size={32} color="rgba(96, 165, 250, 0.4)" />
          <Text style={styles.quoteText}>{streakData.dailyQuote}</Text>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  centerAll: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 16,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
  },
  backNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backNavText: {
    color: '#E2E8F0',
    fontSize: 16,
    marginLeft: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireEmoji: {
    fontSize: 32,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statUnit: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 4,
    fontWeight: '500',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 16,
  },
  calendarCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  calendarGradient: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  calendarDayCol: {
    alignItems: 'center',
  },
  calendarDayText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  calendarDayTextActive: {
    color: '#F8FAFC',
  },
  calendarDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calendarDotToday: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.2 }],
  },
  progressCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  progressGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
  },
  tasksContainer: {
    flex: 1,
    marginLeft: 24,
    justifyContent: 'center',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginLeft: 8,
  },
  taskLabelCompleted: {
    color: '#E2E8F0',
    textDecorationLine: 'line-through',
  },
  insightCard: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  insightText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 22,
  },
  achievementsScroll: {
    paddingRight: 20,
  },
  badgeCard: {
    width: 100,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  quoteSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  quoteText: {
    color: '#94A3B8',
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  }
});
