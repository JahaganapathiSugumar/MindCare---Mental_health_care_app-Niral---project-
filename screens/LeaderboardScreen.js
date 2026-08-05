import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { getFirebaseInstance, getAuth_ } from '../firebase';
import { collection, query, orderBy, limit, getDocs, doc, onSnapshot, where } from 'firebase/firestore';
import TopBackButton from '../components/ui/Premium/TopBackButton';

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
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

export default function LeaderboardScreen() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myRank, setMyRank] = useState(null);
  const [myData, setMyData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    setupRealtimeListener();
    return () => {};
  }, []);

  const setupRealtimeListener = () => {
    try {
      const { db } = getFirebaseInstance();
      const currentUser = getAuth_()?.currentUser;
      if (!currentUser) return;

      // Try to listen to users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('totalXP', 'desc'), limit(100));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const users = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          users.push({
            id: docSnap.id,
            name: data.fullName || data.displayName || data.email?.split('@')[0] || 'Anonymous',
            xp: data.totalXP || 0,
            streak: data.streak || 0,
            level: data.level || 1,
            avatar: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName || data.email || 'User')}&background=random&color=fff&size=64`,
            isMe: currentUser.uid === docSnap.id,
          });
        });

        users.forEach((u, index) => {
          u.rank = index + 1;
        });

        setLeaderboardData(users);
        
        const me = users.find(u => u.isMe);
        if (me) {
          setMyRank(me.rank);
          setMyData(me);
        }
        setError(null);
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        console.error('Error fetching leaderboard:', error);
        setError('Unable to load leaderboard. Please check your connection.');
        setLoading(false);
        setRefreshing(false);
        // Try fallback with current user only
        loadFallbackData();
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up listener:', error);
      setLoading(false);
      loadFallbackData();
    }
  };

  const loadFallbackData = async () => {
    try {
      const { db } = getFirebaseInstance();
      const currentUser = getAuth_()?.currentUser;
      if (!currentUser) return;

      // Get current user data
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDocs(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        const me = {
          id: currentUser.uid,
          name: data.fullName || data.displayName || data.email?.split('@')[0] || 'You',
          xp: data.totalXP || 0,
          streak: data.streak || 0,
          level: data.level || 1,
          avatar: data.photoURL || `https://ui-avatars.com/api/?name=You&background=random&color=fff&size=64`,
          isMe: true,
          rank: 1,
        };
        setLeaderboardData([me]);
        setMyRank(1);
        setMyData(me);
        setError('Showing your stats only. Leaderboard will load when permissions are set.');
      }
      setLoading(false);
    } catch (err) {
      console.error('Fallback error:', err);
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { db } = getFirebaseInstance();
      const currentUser = getAuth_()?.currentUser;
      
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('totalXP', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      
      const users = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        users.push({
          id: docSnap.id,
          name: data.fullName || data.displayName || data.email?.split('@')[0] || 'Anonymous',
          xp: data.totalXP || 0,
          streak: data.streak || 0,
          level: data.level || 1,
          avatar: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName || data.email || 'User')}&background=random&color=fff&size=64`,
          isMe: currentUser.uid === docSnap.id,
        });
      });

      users.forEach((u, index) => {
        u.rank = index + 1;
      });

      setLeaderboardData(users);
      
      const me = users.find(u => u.isMe);
      if (me) {
        setMyRank(me.rank);
        setMyData(me);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Unable to load leaderboard.');
      // Try fallback
      await loadFallbackData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return COLORS.gold;
    if (rank === 2) return COLORS.silver;
    if (rank === 3) return COLORS.bronze;
    return null;
  };

  const getMedalIcon = (rank) => {
    if (rank === 1) return 'crown';
    if (rank === 2) return 'medal';
    if (rank === 3) return 'medal';
    return null;
  };

  const renderTopThree = () => {
    const topThree = leaderboardData.slice(0, 3);
    if (topThree.length < 3) return null;

    const ordered = [topThree[1], topThree[0], topThree[2]];

    return (
      <View style={styles.podiumContainer}>
        {ordered.map((user, index) => {
          const isFirst = index === 1;
          const heights = [140, 180, 120];
          const colors = [COLORS.silver, COLORS.gold, COLORS.bronze];
          
          return (
            <Animated.View 
              key={user.id} 
              entering={FadeInUp.delay(index * 150).duration(600)} 
              style={[styles.podiumItem, { height: heights[index] }]}
            >
              {isFirst && (
                <MaterialCommunityIcons 
                  name="crown" 
                  size={32} 
                  color={COLORS.gold} 
                  style={styles.crown} 
                />
              )}
              <Image source={{ uri: user.avatar }} style={[styles.podiumAvatar, isFirst && styles.podiumAvatarFirst]} />
              <View style={[styles.podiumBase, { backgroundColor: colors[index] }]}>
                <MaterialCommunityIcons 
                  name={getMedalIcon(index === 1 ? 1 : index === 0 ? 2 : 3)} 
                  size={20} 
                  color={isFirst ? '#000' : '#FFF'} 
                  style={styles.medalIcon}
                />
                <Text style={[styles.podiumRank, isFirst && styles.podiumRankFirst]}>
                  {index === 1 ? 1 : index === 0 ? 2 : 3}
                </Text>
                <Text style={[styles.podiumName, isFirst && styles.podiumNameFirst]} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={[styles.podiumXp, isFirst && styles.podiumXpFirst]}>
                  {user.xp} XP
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <TopBackButton fallbackRoute="WellnessDashboard" />
        
        <View style={styles.header}>
          <View>
            <Text style={{height:30}}></Text>
            <Text style={styles.title}>🏆 Leaderboard</Text>
            <Text style={styles.subtitle}>
              {myRank ? `#${myRank} out of ${leaderboardData.length}` : 'Start earning XP to rank up!'}
            </Text>
          </View>
          <View style={styles.statsBadge}>
            <MaterialCommunityIcons name="star" size={16} color={COLORS.primary} />
            <Text style={styles.statsBadgeText}>
              {myData ? `${myData.xp} XP` : '0 XP'}
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.warning} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Top 3 Podium */}
          {leaderboardData.length >= 3 && renderTopThree()}

          {/* My Rank Card */}
          {myData && myRank > 3 && (
            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
              <View style={styles.myRankCard}>
                <View style={styles.myRankContent}>
                  <View style={styles.myRankLeft}>
                    <Text style={styles.myRankNumber}>#{myRank}</Text>
                    <Image source={{ uri: myData.avatar }} style={styles.myRankAvatar} />
                    <View>
                      <Text style={styles.myRankName}>{myData.name}</Text>
                      <Text style={styles.myRankDetails}>Lvl {myData.level} • {myData.streak}d streak</Text>
                    </View>
                  </View>
                  <Text style={styles.myRankXp}>{myData.xp} XP</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Leaderboard List */}
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderRank}>#</Text>
              <Text style={styles.listHeaderName}>User</Text>
              <Text style={styles.listHeaderXp}>XP</Text>
            </View>

            {leaderboardData.map((user, index) => {
              const isTop3 = index < 3;
              const isMe = user.isMe;
              const medalColor = getMedalColor(index + 1);
              
              return (
                <Animated.View 
                  key={user.id} 
                  entering={FadeInDown.delay(50 + index * 30).duration(400)}
                >
                  <View style={[
                    styles.listCard,
                    isMe && styles.myCard,
                    isTop3 && styles.topCard,
                  ]}>
                    <View style={styles.listRankContainer}>
                      {isTop3 ? (
                        <MaterialCommunityIcons 
                          name={getMedalIcon(index + 1)} 
                          size={20} 
                          color={medalColor} 
                        />
                      ) : (
                        <Text style={styles.listRank}>{index + 1}</Text>
                      )}
                    </View>
                    
                    <Image source={{ uri: user.avatar }} style={styles.listAvatar} />
                    
                    <View style={styles.listInfo}>
                      <Text style={[styles.listName, isMe && styles.myName]} numberOfLines={1}>
                        {user.name}
                        {isMe && ' (You)'}
                      </Text>
                      <Text style={styles.listSubinfo}>
                        Lvl {user.level} • {user.streak}d streak
                      </Text>
                    </View>
                    
                    <View style={styles.listStats}>
                      <Text style={[styles.listXp, isTop3 && styles.topXp]}>{user.xp}</Text>
                      <Text style={styles.xpLabel}>XP</Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {leaderboardData.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="trophy-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No users yet</Text>
              <Text style={styles.emptyText}>Start earning XP to appear on the leaderboard!</Text>
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
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  statsBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.warning}10`,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 220,
    marginBottom: 24,
    gap: 8,
  },
  podiumItem: {
    width: '30%',
    alignItems: 'center',
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: -25,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  podiumAvatarFirst: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: COLORS.gold,
    marginBottom: -32,
  },
  crown: {
    position: 'absolute',
    top: -30,
    zIndex: 20,
  },
  medalIcon: {
    marginBottom: 2,
  },
  podiumBase: {
    width: '100%',
    flex: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    paddingTop: 35,
    paddingBottom: 10,
  },
  podiumRank: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  podiumRankFirst: {
    color: '#000',
  },
  podiumName: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
    width: '90%',
    textAlign: 'center',
    marginTop: 2,
  },
  podiumNameFirst: {
    color: '#000',
  },
  podiumXp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  podiumXpFirst: {
    color: 'rgba(0,0,0,0.7)',
  },
  myRankCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  myRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myRankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  myRankAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  myRankName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  myRankDetails: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  myRankXp: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listContainer: {
    gap: 8,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  listHeaderRank: {
    width: 32,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  listHeaderName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  listHeaderXp: {
    width: 60,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'right',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  topCard: {
    backgroundColor: `${COLORS.primary}05`,
  },
  myCard: {
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  listRankContainer: {
    width: 32,
    alignItems: 'center',
  },
  listRank: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  listAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 10,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  myName: {
    color: COLORS.primary,
  },
  listSubinfo: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 1,
  },
  listStats: {
    alignItems: 'flex-end',
  },
  listXp: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  topXp: {
    color: COLORS.primary,
  },
  xpLabel: {
    fontSize: 9,
    color: COLORS.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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