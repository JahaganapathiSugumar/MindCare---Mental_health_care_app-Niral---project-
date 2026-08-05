import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import TopBackButton from '../components/ui/Premium/TopBackButton';
import { getFirebaseInstance, getAuth_ } from '../firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { ACHIEVEMENTS, initializeAchievements } from '../services/gamificationService';

const { width } = Dimensions.get('window');

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
  consistency: '#3498DB',
  chat: '#9B59B6',
};

const AchievementProgress = ({ progress, maxProgress, color = COLORS.primary }) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring((progress / maxProgress) * 100, { damping: 20, stiffness: 90 });
  }, [progress, maxProgress]);

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${Math.max(0, Math.min(100, animatedProgress.value))}%`,
    };
  });

  const percentage = Math.round((progress / maxProgress) * 100);

  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressTrack, { backgroundColor: `${color}20` }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: color }, progressStyle]} />
      </View>
      <Text style={styles.progressText}>{percentage}%</Text>
    </View>
  );
};

export default function AchievementGalleryScreen() {
  const [userAchievements, setUserAchievements] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalUnlocked, setTotalUnlocked] = useState(0);
  const [totalAchievements, setTotalAchievements] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [chatProgress, setChatProgress] = useState(0);
  const [consistencyProgress, setConsistencyProgress] = useState(0);

  useEffect(() => {
    checkAndInitializeAchievements();
    setupRealtimeListener();
    return () => {};
  }, []);

  const checkAndInitializeAchievements = async () => {
    try {
      const currentUser = getAuth_()?.currentUser;
      if (!currentUser) return;

      const { db } = getFirebaseInstance();
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        // Check if achievements exist, if not initialize
        if (!data.achievements) {
          await initializeAchievements(currentUser.uid);
          console.log('[Achievements] Initialized achievements for user');
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  const setupRealtimeListener = () => {
    try {
      const { db } = getFirebaseInstance();
      const currentUser = getAuth_()?.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const achievements = data.achievements || {};
          setUserAchievements(achievements);
          setLastUpdated(new Date());
          
          // Count unlocked achievements
          const unlocked = Object.values(achievements).filter(a => a.isCompleted).length;
          setTotalUnlocked(unlocked);
          setTotalAchievements(Object.keys(ACHIEVEMENTS).length);

          // Calculate Chat Progress
          const chatAch = achievements['chat_master'] || { progress: 0 };
          const chatMax = ACHIEVEMENTS['chat_master']?.maxProgress || 100;
          setChatProgress(Math.min((chatAch.progress / chatMax) * 100, 100));

          // Calculate Consistency Progress
          const consAch = achievements['consistency_30_day'] || { progress: 0 };
          const consMax = ACHIEVEMENTS['consistency_30_day']?.maxProgress || 30;
          setConsistencyProgress(Math.min((consAch.progress / consMax) * 100, 100));
        }
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        console.error('Error listening to achievements:', error);
        setLoading(false);
        setRefreshing(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up listener:', error);
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getIconForCategory = (category) => {
    switch(category) {
      case 'Consistency': return { name: 'fire', color: COLORS.consistency };
      case 'AI': return { name: 'robot', color: COLORS.purple };
      case 'Journal': return { name: 'book-open-variant', color: COLORS.primary };
      case 'Mood Tracking': return { name: 'emoticon-happy', color: '#E67E22' };
      case 'Mindfulness': return { name: 'meditation', color: COLORS.success };
      case 'Learning': return { name: 'school', color: COLORS.gold };
      case 'Chat': return { name: 'chat', color: COLORS.chat };
      default: return { name: 'star', color: COLORS.gold };
    }
  };

  const getCategories = () => {
    const categories = ['All'];
    Object.values(ACHIEVEMENTS).forEach(a => {
      if (!categories.includes(a.category)) {
        categories.push(a.category);
      }
    });
    return categories;
  };

  const getCategoryCount = (category) => {
    if (category === 'All') {
      return allAchievementsList.length;
    }
    return allAchievementsList.filter(a => a.category === category).length;
  };

  const allAchievementsList = Object.values(ACHIEVEMENTS).map(a => {
    const userAch = userAchievements[a.id] || { progress: 0, isCompleted: false };
    const iconData = getIconForCategory(a.category);
    return {
      ...a,
      progress: userAch.progress || 0,
      isCompleted: userAch.isCompleted || false,
      icon: iconData.name,
      color: iconData.color,
    };
  });

  const filteredAchievements = selectedCategory === 'All' 
    ? allAchievementsList 
    : allAchievementsList.filter(a => a.category === selectedCategory);

  filteredAchievements.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1;
    const aRatio = a.progress / a.maxProgress;
    const bRatio = b.progress / b.maxProgress;
    return bRatio - aRatio;
  });

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
        <Text style={styles.loadingText}>Loading achievements...</Text>
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
                <Text style={styles.title}>🏆 Achievements</Text>
                <Text style={styles.subtitle}>Your wellness journey milestones</Text>
              </View>
              {lastUpdated && (
                <View style={styles.lastUpdated}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color={COLORS.textLight} />
                  <Text style={styles.lastUpdatedText}>Updated {formatTime(lastUpdated)}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.statsCard}>
              <View style={[styles.statsIconContainer, { backgroundColor: `${COLORS.success}15` }]}>
                <MaterialCommunityIcons name="trophy" size={22} color={COLORS.success} />
              </View>
              <Text style={styles.statsCardLabel}>Unlocked</Text>
              <Text style={styles.statsCardValue}>{totalUnlocked}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.statsCard}>
              <View style={[styles.statsIconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                <MaterialCommunityIcons name="progress-star" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.statsCardLabel}>Total</Text>
              <Text style={styles.statsCardValue}>{totalAchievements}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.statsCard}>
              <View style={[styles.statsIconContainer, { backgroundColor: `${COLORS.warning}15` }]}>
                <MaterialCommunityIcons name="percent" size={22} color={COLORS.warning} />
              </View>
              <Text style={styles.statsCardLabel}>Progress</Text>
              <Text style={styles.statsCardValue}>
                {totalAchievements > 0 ? Math.round((totalUnlocked / totalAchievements) * 100) : 0}%
              </Text>
            </Animated.View>
          </View>

          {/* Progress Cards */}
          <View style={styles.progressCardsRow}>
            <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.progressCard}>
              <View style={styles.progressCardHeader}>
                <View style={[styles.progressCardIcon, { backgroundColor: `${COLORS.chat}20` }]}>
                  <MaterialCommunityIcons name="chat" size={18} color={COLORS.chat} />
                </View>
                <Text style={styles.progressCardTitle}>Chat Activity</Text>
              </View>
              <View style={styles.progressCardBody}>
                <AchievementProgress progress={chatProgress} maxProgress={100} color={COLORS.chat} />
                <Text style={styles.progressCardDetail}>
                  {Math.round(chatProgress)}% complete
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(600)} style={styles.progressCard}>
              <View style={styles.progressCardHeader}>
                <View style={[styles.progressCardIcon, { backgroundColor: `${COLORS.consistency}20` }]}>
                  <MaterialCommunityIcons name="fire" size={18} color={COLORS.consistency} />
                </View>
                <Text style={styles.progressCardTitle}>Consistency</Text>
              </View>
              <View style={styles.progressCardBody}>
                <AchievementProgress progress={consistencyProgress} maxProgress={100} color={COLORS.consistency} />
                <Text style={styles.progressCardDetail}>
                  {Math.round(consistencyProgress)}% complete
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Category Filter */}
          <Animated.View entering={FadeInDown.delay(350).duration(600)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {getCategories().map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.categoryChipTextActive,
                  ]}>
                    {category} ({getCategoryCount(category)})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Achievements Grid */}
          <View style={styles.gridContainer}>
            {filteredAchievements.map((achievement, index) => (
              <Animated.View 
                key={achievement.id} 
                entering={FadeInDown.delay(100 + index * 50).duration(500)} 
                style={styles.gridItem}
              >
                <View style={[
                  styles.card,
                  achievement.isCompleted ? styles.cardCompleted : styles.cardLocked,
                ]}>
                  <View style={[
                    styles.iconContainer, 
                    { 
                      backgroundColor: achievement.isCompleted ? achievement.color : `${COLORS.textLight}20`,
                      borderColor: achievement.isCompleted ? achievement.color : COLORS.border,
                      borderWidth: achievement.isCompleted ? 0 : 1,
                    }
                  ]}>
                    <MaterialCommunityIcons 
                      name={achievement.icon} 
                      size={32} 
                      color={achievement.isCompleted ? '#FFFFFF' : COLORS.textLight} 
                    />
                    {achievement.isCompleted && (
                      <View style={styles.completedOverlay}>
                        <MaterialCommunityIcons name="check-circle" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.cardTitle} numberOfLines={1}>{achievement.title}</Text>
                  <Text style={styles.cardCategory}>{achievement.category}</Text>
                  <Text style={styles.cardDescription} numberOfLines={2}>{achievement.description}</Text>
                  
                  {!achievement.isCompleted && achievement.maxProgress > 1 && (
                    <AchievementProgress 
                      progress={achievement.progress} 
                      maxProgress={achievement.maxProgress} 
                      color={achievement.color}
                    />
                  )}

                  {achievement.isCompleted ? (
                    <View style={styles.completedBadge}>
                      <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.success} />
                      <Text style={styles.completedText}>Unlocked</Text>
                    </View>
                  ) : (
                    <View style={styles.lockedBadge}>
                      <MaterialCommunityIcons name="lock" size={14} color={COLORS.textLight} />
                      <Text style={styles.lockedText}>Locked</Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Empty State */}
          {filteredAchievements.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="trophy-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No achievements in this category</Text>
              <Text style={styles.emptyText}>Keep going! You'll unlock achievements soon.</Text>
            </View>
          )}

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
    gap: 12,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
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
    marginBottom: 6,
  },
  statsCardLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  statsCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  progressCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  progressCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  progressCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressCardBody: {
    alignItems: 'center',
  },
  progressCardDetail: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: (width - 40 - 12) / 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 220,
  },
  cardCompleted: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  cardLocked: {
    opacity: 0.85,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  completedOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.success,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 15,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 10,
  },
  progressTrack: {
    height: 4,
    backgroundColor: `${COLORS.textLight}15`,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 'auto',
  },
  completedText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
    backgroundColor: `${COLORS.textLight}10`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lockedText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
});