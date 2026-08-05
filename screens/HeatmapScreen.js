import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getAuth_, getFirebaseInstance } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import TopBackButton from '../components/ui/Premium/TopBackButton';
import HeatmapGrid from '../components/ui/Premium/HeatmapGrid';

const { width } = Dimensions.get('window');

// Light color scheme
const COLORS = {
  background: '#F0F4F8',
  card: '#FFFFFF',
  primary: '#4A90D9',
  success: '#2ECC71',
  warning: '#F39C12',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E8EDF2',
  shadow: 'rgba(0,0,0,0.06)',
};

export default function HeatmapScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [heatmapData, setHeatmapData] = useState({});
  const [totalActivities, setTotalActivities] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activityTypes, setActivityTypes] = useState({});
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);

  useEffect(() => {
    fetchHeatmapData();
    setupRealtimeListener();

    return () => {
      // Cleanup listener
    };
  }, []);

  const setupRealtimeListener = () => {
    try {
      const { db } = getFirebaseInstance();
      const currentUser = getAuth_()?.currentUser;
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.uid);
      const unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCurrentStreak(data.streak || 0);
          setLongestStreak(Math.max(data.longestStreak || 0, data.streak || 0));
        }
      });

      const activitiesRef = collection(db, 'activities');
      const q = query(activitiesRef, where('userId', '==', currentUser.uid));
      const unsubActivities = onSnapshot(q, (snapshot) => {
        const activityMap = {};
        let total = 0;
        const types = {};

        snapshot.forEach(doc => {
          const data = doc.data();
          const date = data.createdAt?.seconds
            ? new Date(data.createdAt.seconds * 1000)
            : new Date(data.createdAt || Date.now());

          const dateStr = date.toISOString().split('T')[0];

          if (!activityMap[dateStr]) {
            activityMap[dateStr] = 0;
          }
          activityMap[dateStr]++;
          total++;

          const type = data.type || 'activity';
          types[type] = (types[type] || 0) + 1;
        });

        setHeatmapData(activityMap);
        setTotalActivities(total);
        setActivityTypes(types);
        setLastUpdated(new Date());
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        console.error('Error listening to activities:', error);
        setLoading(false);
      });

      return () => {
        unsubUser();
        unsubActivities();
      };
    } catch (error) {
      console.error('Error setting up listener:', error);
      setLoading(false);
    }
  };

  const fetchHeatmapData = async () => {
    try {
      const { db } = getFirebaseInstance();
      const currentUser = getAuth_()?.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const activitiesRef = collection(db, 'activities');
      const q = query(activitiesRef, where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);

      const activityMap = {};
      let total = 0;
      const types = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.seconds
          ? new Date(data.createdAt.seconds * 1000)
          : new Date(data.createdAt || Date.now());

        const dateStr = date.toISOString().split('T')[0];

        if (!activityMap[dateStr]) {
          activityMap[dateStr] = 0;
        }
        activityMap[dateStr]++;
        total++;

        const type = data.type || 'activity';
        types[type] = (types[type] || 0) + 1;
      });

      setHeatmapData(activityMap);
      setTotalActivities(total);
      setActivityTypes(types);
      setLastUpdated(new Date());
    } catch (error) {
      console.warn('Error fetching heatmap data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHeatmapData();
  }, []);

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const getTopActivityType = () => {
    if (Object.keys(activityTypes).length === 0) return 'No activities yet';
    const sorted = Object.entries(activityTypes).sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  };

  const handleDayPress = (day) => {
    setSelectedDayInfo(day);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading activity data...</Text>
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
                <Text style={styles.title}>📅 Yearly Activity</Text>
                <Text style={styles.subtitle}>Your wellness journey mapped out</Text>
              </View>
              {lastUpdated && (
                <View style={styles.lastUpdated}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color={COLORS.textLight} />
                  <Text style={styles.lastUpdatedText}>Updated {formatTime(lastUpdated)}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Stats Cards Row */}
          <View style={styles.statsRow}>
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.statsCard}>
              <View style={[styles.statsIconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                <MaterialCommunityIcons name="calendar-check" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.statsCardLabel}>Total Activities</Text>
              <Text style={styles.statsCardValue}>{totalActivities.toLocaleString()}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.statsCard}>
              <View style={[styles.statsIconContainer, { backgroundColor: `${COLORS.success}15` }]}>
                <MaterialCommunityIcons name="fire" size={22} color={COLORS.success} />
              </View>
              <Text style={styles.statsCardLabel}>Current Streak</Text>
              <Text style={styles.statsCardValue}>{currentStreak} days</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.statsCard}>
              <View style={[styles.statsIconContainer, { backgroundColor: `${COLORS.warning}15` }]}>
                <MaterialCommunityIcons name="trophy" size={22} color={COLORS.warning} />
              </View>
              <Text style={styles.statsCardLabel}>Longest Streak</Text>
              <Text style={styles.statsCardValue}>{longestStreak} days</Text>
            </Animated.View>
          </View>

          {/* Top Activity Type */}
          <Animated.View entering={FadeInDown.delay(350).duration(600)} style={styles.activityTypeCard}>
            <MaterialCommunityIcons name="chart-pie" size={18} color={COLORS.primary} />
            <Text style={styles.activityTypeText}>
              Most common activity: <Text style={styles.activityTypeHighlight}>{getTopActivityType()}</Text>
            </Text>
          </Animated.View>

          {/* Heatmap - Fixed height to prevent vertical scrolling */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            <View style={styles.heatmapCard}>
              <View style={styles.heatmapHeader}>
                <Text style={styles.heatmapTitle}>Activity Heatmap</Text>
                <Text style={styles.heatmapSubtitle}>{new Date().getFullYear()}</Text>
              </View>
              <View style={styles.heatmapContainer}>
                <HeatmapGrid data={heatmapData} onDayPress={handleDayPress} />
              </View>
            </View>
          </Animated.View>

          {/* Legend */}
          <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.legendCard}>
            <Text style={styles.legendTitle}>Activity Level</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#EBEDF0' }]} />
                <Text style={styles.legendText}>0</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#9BE9A8' }]} />
                <Text style={styles.legendText}>1-3</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#40C463' }]} />
                <Text style={styles.legendText}>4-6</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#30A14E' }]} />
                <Text style={styles.legendText}>7-10</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#216E39' }]} />
                <Text style={styles.legendText}>10+</Text>
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
    gap: 12,
    marginBottom: 14,
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
  activityTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}08`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  activityTypeText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  activityTypeHighlight: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  heatmapCard: {
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
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heatmapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  heatmapSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  heatmapContainer: {
    minHeight: 160,
    maxHeight: 180,
  },
  legendCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  legendItem: {
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
});