import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../components/ui/Premium/Theme';
import { GlassCard } from '../components/ui/Premium/GlassCard';
import { AnimatedRing } from '../components/ui/Premium/AnimatedRing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getFirebaseInstance, getAuth_ } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function WellnessDashboardScreen({ navigation }) {
  const [userData, setUserData] = React.useState({ level: 1, streak: 0, name: 'User' });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { db } = getFirebaseInstance();
        const currentUser = getAuth_()?.currentUser;
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              level: data.level || 1,
              streak: data.streak || 0,
              name: data.fullName?.split(' ')[0] || data.email?.split('@')[0] || 'User'
            });
          }
        }
      } catch (error) {
        console.warn('Error fetching dashboard user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.background, '#1A2130']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <Text style={styles.greeting}>Good Evening, {userData.name} 👋</Text>
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <MaterialCommunityIcons name="star" color={Theme.colors.gold} size={16} />
                <Text style={styles.statText}>Lvl {userData.level}</Text>
              </View>
              <View style={styles.statChip}>
                <MaterialCommunityIcons name="fire" color={Theme.colors.success} size={16} />
                <Text style={styles.statText}>{userData.streak} Day Streak</Text>
              </View>
            </View>
          </Animated.View>

          {/* Today's Progress */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <GlassCard style={styles.progressCard}>
              <Text style={styles.sectionTitle}>Today's Progress</Text>
              <View style={styles.ringsContainer}>
                <View style={styles.ringWrapper}>
                  <AnimatedRing progress={0.8} color={Theme.colors.primary} radius={45} />
                  <MaterialCommunityIcons name="emoticon-happy" size={24} color={Theme.colors.primary} style={styles.ringIcon} />
                  <Text style={styles.ringLabel}>Mood</Text>
                </View>
                <View style={styles.ringWrapper}>
                  <AnimatedRing progress={0.5} color={Theme.colors.purple} radius={45} />
                  <MaterialCommunityIcons name="brain" size={24} color={Theme.colors.purple} style={styles.ringIcon} />
                  <Text style={styles.ringLabel}>AI Chat</Text>
                </View>
                <View style={styles.ringWrapper}>
                  <AnimatedRing progress={1.0} color={Theme.colors.success} radius={45} />
                  <MaterialCommunityIcons name="leaf" size={24} color={Theme.colors.success} style={styles.ringIcon} />
                  <Text style={styles.ringLabel}>Breathe</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Quick Access Grid */}
          <View style={styles.gridContainer}>
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.gridItem}>
              <TouchableOpacity onPress={() => navigation.navigate('AchievementGallery')}>
                <GlassCard style={styles.actionCard}>
                  <MaterialCommunityIcons name="trophy-award" size={32} color={Theme.colors.gold} />
                  <Text style={styles.actionCardTitle}>Achievements</Text>
                  <Text style={styles.actionCardSubtitle}>4 Unlocked</Text>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
            
            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.gridItem}>
              <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
                <GlassCard style={styles.actionCard}>
                  <MaterialCommunityIcons name="podium" size={32} color={Theme.colors.primary} />
                  <Text style={styles.actionCardTitle}>Leaderboard</Text>
                  <Text style={styles.actionCardSubtitle}>Rank #42</Text>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.gridItem}>
              <TouchableOpacity onPress={() => navigation.navigate('Heatmap')}>
                <GlassCard style={styles.actionCard}>
                  <MaterialCommunityIcons name="calendar-month" size={32} color={Theme.colors.accent} />
                  <Text style={styles.actionCardTitle}>Heatmap</Text>
                  <Text style={styles.actionCardSubtitle}>View Activity</Text>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.gridItem}>
              <TouchableOpacity onPress={() => navigation.navigate('TherapistHub')}>
                <GlassCard style={styles.actionCard}>
                  <MaterialCommunityIcons name="doctor" size={32} color={Theme.colors.success} />
                  <Text style={styles.actionCardTitle}>Therapist Hub</Text>
                  <Text style={styles.actionCardSubtitle}>Human Support</Text>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { padding: Theme.spacing.lg },
  header: { marginBottom: Theme.spacing.xl, marginTop: Theme.spacing.md },
  greeting: { ...Theme.typography.h1, marginBottom: Theme.spacing.sm },
  statsRow: { flexDirection: 'row', gap: Theme.spacing.sm },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    gap: 4,
  },
  statText: { ...Theme.typography.caption, color: '#FFF', fontWeight: 'bold' },
  progressCard: { marginBottom: Theme.spacing.lg },
  sectionTitle: { ...Theme.typography.h3, marginBottom: Theme.spacing.lg },
  ringsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  ringWrapper: { alignItems: 'center', justifyContent: 'center' },
  ringIcon: { position: 'absolute', top: 32 },
  ringLabel: { ...Theme.typography.caption, marginTop: Theme.spacing.sm },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.md },
  gridItem: { width: '47%' },
  actionCard: { alignItems: 'flex-start', padding: Theme.spacing.md },
  actionCardTitle: { ...Theme.typography.body, color: '#FFF', fontWeight: '600', marginTop: Theme.spacing.sm },
  actionCardSubtitle: { ...Theme.typography.caption, marginTop: 4 },
});
