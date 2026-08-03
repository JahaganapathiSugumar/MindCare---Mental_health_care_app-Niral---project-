import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../components/ui/Premium/Theme';
import { GlassCard } from '../components/ui/Premium/GlassCard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getAuth_, getFirebaseInstance } from '../firebase';
import { getYearlyActivityMap } from '../services/firebase';

const { width } = Dimensions.get('window');

const getColorForLevel = (level) => {
  switch (level) {
    case 5: return Theme.colors.heatmap.level5;
    case 4: return Theme.colors.heatmap.level4;
    case 3: return Theme.colors.heatmap.level3;
    case 2: return Theme.colors.heatmap.level2;
    case 1: return Theme.colors.heatmap.level1;
    default: return Theme.colors.heatmap.level0;
  }
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HeatmapScreen() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalActivities, setTotalActivities] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const fetchHeatmapData = async () => {
    try {
      const currentUser = getAuth_()?.currentUser;
      if (!currentUser) return;
      
      const { db } = getFirebaseInstance();
      // Need to import doc, getDoc from firestore
      const { doc, getDoc } = require('firebase/firestore');
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setCurrentStreak(data.currentMoodStreak || data.streak || 0);
        // longestStreak logic isn't fully robust, but we can default to max of current and stored
        setLongestStreak(Math.max(data.longestStreak || 0, data.currentMoodStreak || 0));
      }

      const activityMap = await getYearlyActivityMap(currentUser.uid);
      
      // Calculate total activities
      let total = 0;
      Object.values(activityMap).forEach(count => { total += count; });
      setTotalActivities(total);

      // Build 52 weeks * 7 days flat array (364 days).
      // Index 363 (end) is today. Index 0 is 363 days ago.
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const data = new Array(364).fill(0);
      
      for (let i = 0; i < 364; i++) {
        // Go back (363 - i) days
        const d = new Date(today);
        d.setDate(today.getDate() - (363 - i));
        const key = toDateKey(d);
        
        const count = activityMap[key] || 0;
        let level = 0;
        if (count >= 5) level = 5;
        else if (count === 4) level = 4;
        else if (count === 3) level = 3;
        else if (count === 2) level = 2;
        else if (count === 1) level = 1;
        
        data[i] = level;
      }
      
      setHeatmapData(data);
    } catch (error) {
      console.warn('Error fetching heatmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderHeatmap = () => {
    if (loading) {
      return (
        <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      );
    }

    const weeks = [];
    for (let i = 0; i < 52; i++) {
      const days = [];
      for (let j = 0; j < 7; j++) {
        const level = heatmapData[i * 7 + j] || 0;
        days.push(
          <View
            key={`day-${i}-${j}`}
            style={[styles.heatmapSquare, { backgroundColor: getColorForLevel(level) }]}
          />
        );
      }
      weeks.push(<View key={`week-${i}`} style={styles.heatmapColumn}>{days}</View>);
    }
    return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heatmapGrid}>{weeks}</ScrollView>;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.background, '#1A2130']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Text style={styles.title}>Yearly Activity</Text>
            <Text style={styles.subtitle}>Your wellness journey mapped out</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <GlassCard style={styles.card}>
              {renderHeatmap()}
              <View style={styles.legendContainer}>
                <Text style={styles.legendText}>Less</Text>
                {[0, 1, 2, 3, 4, 5].map((level) => (
                  <View key={`legend-${level}`} style={[styles.heatmapSquare, { backgroundColor: getColorForLevel(level) }]} />
                ))}
                <Text style={styles.legendText}>More</Text>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.summaryContainer}>
            <GlassCard style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{totalActivities.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Activities</Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{currentStreak}</Text>
              <Text style={styles.summaryLabel}>Current Streak</Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{longestStreak}</Text>
              <Text style={styles.summaryLabel}>Longest Streak</Text>
            </GlassCard>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { padding: Theme.spacing.lg },
  title: { ...Theme.typography.h1, marginTop: Theme.spacing.md },
  subtitle: { ...Theme.typography.body, marginBottom: Theme.spacing.xl },
  card: { padding: Theme.spacing.md, marginBottom: Theme.spacing.lg },
  heatmapGrid: { flexDirection: 'row', gap: 4, paddingVertical: 10 },
  heatmapColumn: { gap: 4 },
  heatmapSquare: { width: 12, height: 12, borderRadius: 2 },
  legendContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: Theme.spacing.md },
  legendText: { ...Theme.typography.caption, fontSize: 10 },
  summaryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.md },
  summaryCard: { flex: 1, minWidth: '45%', alignItems: 'center', padding: Theme.spacing.md },
  summaryValue: { ...Theme.typography.h2, color: Theme.colors.primary },
  summaryLabel: { ...Theme.typography.caption, marginTop: 4 },
});
