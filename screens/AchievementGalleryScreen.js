import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../components/ui/Premium/Theme';
import { GlassCard } from '../components/ui/Premium/GlassCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import TopBackButton from '../components/ui/Premium/TopBackButton';

const { width } = Dimensions.get('window');

const ACHIEVEMENTS = [
  { id: '1', title: '7-Day Calm Streak', description: 'Logged mood for 7 consecutive days', xp: 500, unlocked: true, icon: 'fire', color: Theme.colors.success },
  { id: '2', title: 'Meditation Master', description: 'Completed 10 breathing sessions', xp: 1000, unlocked: true, icon: 'meditation', color: Theme.colors.purple },
  { id: '3', title: 'Journal Explorer', description: 'Wrote 5 journal entries', xp: 750, unlocked: true, icon: 'book-open-variant', color: Theme.colors.primary },
  { id: '4', title: 'AI Chat Expert', description: 'Chatted with Nova 20 times', xp: 1500, unlocked: true, icon: 'robot', color: Theme.colors.accent },
  { id: '5', title: '100-Day Legend', description: 'Reached a 100-day streak', xp: 5000, unlocked: false, icon: 'crown', color: Theme.colors.gold },
  { id: '6', title: 'Kind Mind', description: 'Completed all positivity challenges', xp: 2000, unlocked: false, icon: 'heart', color: '#EF4444' },
];

export default function AchievementGalleryScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.background, '#1A2130']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <TopBackButton fallbackRoute="Home" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Text style={styles.title}>Achievements</Text>
            <Text style={styles.subtitle}>Your wellness trophies</Text>
          </Animated.View>

          <View style={styles.gridContainer}>
            {ACHIEVEMENTS.map((achievement, index) => (
              <Animated.View key={achievement.id} entering={FadeInDown.delay(200 + index * 100).duration(600)} style={styles.gridItem}>
                <GlassCard style={[styles.card, !achievement.unlocked && styles.cardLocked]} intensity={achievement.unlocked ? 20 : 60}>
                  <View style={[styles.iconContainer, { backgroundColor: achievement.unlocked ? achievement.color : Theme.colors.textSecondary }]}>
                    <MaterialCommunityIcons name={achievement.icon} size={32} color="#FFF" />
                  </View>
                  <Text style={styles.cardTitle}>{achievement.title}</Text>
                  <Text style={styles.cardDescription}>{achievement.description}</Text>
                  
                  {achievement.unlocked ? (
                    <View style={styles.xpBadge}>
                      <Text style={styles.xpText}>+{achievement.xp} XP</Text>
                    </View>
                  ) : (
                    <View style={styles.lockedBadge}>
                      <MaterialCommunityIcons name="lock" size={14} color={Theme.colors.textSecondary} />
                      <Text style={styles.lockedText}>Locked</Text>
                    </View>
                  )}
                </GlassCard>
              </Animated.View>
            ))}
          </View>
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
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.md },
  gridItem: { width: (width - Theme.spacing.lg * 2 - Theme.spacing.md) / 2 },
  card: { alignItems: 'center', padding: Theme.spacing.md, minHeight: 220 },
  cardLocked: { opacity: 0.6 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: Theme.spacing.md },
  cardTitle: { ...Theme.typography.body, color: '#FFF', fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  cardDescription: { ...Theme.typography.caption, textAlign: 'center', marginBottom: Theme.spacing.md },
  xpBadge: { backgroundColor: 'rgba(56, 189, 248, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 'auto' },
  xpText: { ...Theme.typography.caption, color: Theme.colors.accent, fontWeight: 'bold' },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto' },
  lockedText: { ...Theme.typography.caption },
});
