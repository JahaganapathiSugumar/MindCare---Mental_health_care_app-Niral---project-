import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../components/ui/Premium/Theme';
import { GlassCard } from '../components/ui/Premium/GlassCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { getFirebaseInstance, getAuth_ } from '../firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

export default function LeaderboardScreen() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { db } = getFirebaseInstance();
      const currentUser = getAuth_()?.currentUser;
      
      const usersRef = collection(db, 'users');
      // Fetch up to 50 public users
      const q = query(usersRef, where('isPublic', '==', true), limit(50));
      const snapshot = await getDocs(q);
      
      const users = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          id: doc.id,
          name: data.fullName || data.email?.split('@')[0] || 'Unknown User',
          xp: data.xp || 0,
          streak: data.streak || 0,
          level: data.level || 1,
          trend: Math.floor(Math.random() * 5) - 2, // Keep trend random for visual effect
          avatar: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName || data.email || 'User')}&background=random`,
          isMe: currentUser?.uid === doc.id
        });
      });

      // Sort in memory by XP since orderBy requires an index if mixed with other filters
      users.sort((a, b) => b.xp - a.xp);
      
      // Assign ranks
      users.forEach((u, index) => {
        u.rank = index + 1;
      });

      // If we don't have enough users for podium, add some dummy ones
      while (users.length < 3) {
        users.push({
          id: `dummy-${users.length}`,
          name: 'MindCare User',
          xp: 0,
          streak: 0,
          level: 1,
          trend: 0,
          avatar: 'https://ui-avatars.com/api/?name=User&background=random',
          rank: users.length + 1
        });
      }

      setLeaderboardData(users);
    } catch (error) {
      console.warn('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPodium = () => {
    if (leaderboardData.length < 3) return null;
    
    return (
      <View style={styles.podiumContainer}>
        {/* 2nd Place */}
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={[styles.podiumItem, { height: 140 }]}>
          <Image source={{ uri: leaderboardData[1].avatar }} style={styles.podiumAvatar} />
          <View style={[styles.podiumBase, { backgroundColor: '#C0C0C0' }]}>
            <Text style={styles.podiumRank}>2</Text>
            <Text style={styles.podiumName} numberOfLines={1}>{leaderboardData[1].name}</Text>
            <Text style={styles.podiumXp}>{leaderboardData[1].xp}</Text>
          </View>
        </Animated.View>

        {/* 1st Place */}
        <Animated.View entering={FadeInUp.delay(100).duration(600)} style={[styles.podiumItem, { height: 180 }]}>
          <MaterialCommunityIcons name="crown" size={32} color={Theme.colors.gold} style={styles.crown} />
          <Image source={{ uri: leaderboardData[0].avatar }} style={[styles.podiumAvatar, styles.podiumAvatarFirst]} />
          <View style={[styles.podiumBase, { backgroundColor: Theme.colors.gold }]}>
            <Text style={[styles.podiumRank, { color: '#000' }]}>1</Text>
            <Text style={[styles.podiumName, { color: '#000' }]} numberOfLines={1}>{leaderboardData[0].name}</Text>
            <Text style={[styles.podiumXp, { color: '#000' }]}>{leaderboardData[0].xp}</Text>
          </View>
        </Animated.View>

        {/* 3rd Place */}
        <Animated.View entering={FadeInUp.delay(300).duration(600)} style={[styles.podiumItem, { height: 120 }]}>
          <Image source={{ uri: leaderboardData[2].avatar }} style={styles.podiumAvatar} />
          <View style={[styles.podiumBase, { backgroundColor: '#CD7F32' }]}>
            <Text style={styles.podiumRank}>3</Text>
            <Text style={styles.podiumName} numberOfLines={1}>{leaderboardData[2].name}</Text>
            <Text style={styles.podiumXp}>{leaderboardData[2].xp}</Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.background, '#1A2130']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>Global Wellness Leaderboard</Text>
          </Animated.View>

          {renderPodium()}

          <View style={styles.listContainer}>
            {leaderboardData.slice(3).map((user, index) => (
              <Animated.View key={user.id} entering={FadeInDown.delay(400 + index * 100).duration(600)}>
                <GlassCard style={[styles.listCard, user.isMe && styles.myCard]}>
                  <Text style={styles.listRank}>{user.rank}</Text>
                  <Image source={{ uri: user.avatar }} style={styles.listAvatar} />
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{user.name}</Text>
                    <Text style={styles.listSubinfo}>Lvl {user.level} • {user.streak} day streak</Text>
                  </View>
                  <View style={styles.listStats}>
                    <Text style={styles.listXp}>{user.xp} XP</Text>
                    <View style={styles.trendContainer}>
                      {user.trend > 0 ? (
                        <MaterialCommunityIcons name="menu-up" color={Theme.colors.success} size={20} />
                      ) : user.trend < 0 ? (
                        <MaterialCommunityIcons name="menu-down" color="#EF4444" size={20} />
                      ) : (
                        <MaterialCommunityIcons name="minus" color={Theme.colors.textSecondary} size={16} />
                      )}
                      <Text style={[styles.trendText, { color: user.trend > 0 ? Theme.colors.success : user.trend < 0 ? '#EF4444' : Theme.colors.textSecondary }]}>
                        {Math.abs(user.trend)}
                      </Text>
                    </View>
                  </View>
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
  podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', height: 220, marginBottom: Theme.spacing.xl, gap: Theme.spacing.sm },
  podiumItem: { width: '30%', alignItems: 'center' },
  podiumAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: Theme.colors.cardBorder, marginBottom: -25, zIndex: 10 },
  podiumAvatarFirst: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: Theme.colors.gold, marginBottom: -32 },
  crown: { position: 'absolute', top: -30, zIndex: 20 },
  podiumBase: { width: '100%', flex: 1, borderTopLeftRadius: Theme.borderRadius.md, borderTopRightRadius: Theme.borderRadius.md, alignItems: 'center', paddingTop: 35, paddingBottom: 10 },
  podiumRank: { ...Theme.typography.h2, color: '#FFF' },
  podiumName: { ...Theme.typography.caption, color: '#FFF', fontWeight: 'bold', width: '90%', textAlign: 'center' },
  podiumXp: { ...Theme.typography.caption, color: 'rgba(255,255,255,0.8)' },
  listContainer: { gap: Theme.spacing.sm },
  listCard: { flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.sm, paddingHorizontal: Theme.spacing.md },
  myCard: { borderColor: Theme.colors.primary, borderWidth: 1 },
  listRank: { ...Theme.typography.h3, color: Theme.colors.textSecondary, width: 30 },
  listAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: Theme.spacing.md },
  listInfo: { flex: 1 },
  listName: { ...Theme.typography.body, color: '#FFF', fontWeight: '600' },
  listSubinfo: { ...Theme.typography.caption },
  listStats: { alignItems: 'flex-end' },
  listXp: { ...Theme.typography.body, color: Theme.colors.primary, fontWeight: 'bold' },
  trendContainer: { flexDirection: 'row', alignItems: 'center' },
  trendText: { ...Theme.typography.caption, fontWeight: 'bold' },
});
