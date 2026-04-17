import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ensureAuthInitialized } from '../firebase';
import { fetchProfileData, fetchMoodHistory } from '../services/profileService';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [lastMood, setLastMood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentChats, setRecentChats] = useState([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate greeting on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Load user data
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const auth = await ensureAuthInitialized();
      if (auth?.currentUser) {
        const profile = await fetchProfileData();
        setUserName(profile.fullName || profile.email.split('@')[0]);

        const moods = await fetchMoodHistory(auth.currentUser.uid);
        if (moods.length > 0) {
          setLastMood(moods[0]);
        }

        // Simulate recent chats (placeholder)
        setRecentChats([
          { id: 1, preview: 'I was feeling anxious today...', time: '2 hours ago' },
          { id: 2, preview: 'The breathing exercise helped me...', time: '1 day ago' },
        ]);
      }
    } catch (error) {
      console.error('[HomeScreen] Load error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (mood) => {
    const moodMap = {
      happy: '😊',
      sad: '😔',
      anxious: '😰',
      calm: '😌',
      angry: '😠',
      excited: '🤩',
    };
    return moodMap[mood?.toLowerCase()] || '😶';
  };

  const handleNavigate = (screen) => {
    if (screen === 'Mood') {
      Alert.alert('Coming Soon', 'Mood tracking feature coming soon!');
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section with Gradient */}
        <LinearGradient
          colors={['#4A90E2', '#357ABD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Animated.View
  style={[
    styles.greetingSection,
    {
      marginTop: 30, // 👈 space above the whole block
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    },
  ]}
>
  <Text style={styles.greeting}>
    Hello, {userName || 'Friend'}! 👋
  </Text>
  <Text style={styles.subgreeting}>
    How are you feeling today?
  </Text>
</Animated.View>

            {/* Profile Button */}
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => handleNavigate('Profile')}
              activeOpacity={0.7}
            >
              <View style={styles.profileButtonInner}>
                <Ionicons name="person" size={24} color="#4A90E2" />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            {/* Start Chat Button */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleNavigate('Chat')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#5BA3F5', '#4A90E2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <MaterialCommunityIcons name="chat-outline" size={32} color="#FFF" />
                <Text style={styles.actionCardText}>Start Chat</Text>
                <Text style={styles.actionCardSubtext}>Talk to AI</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Track Mood Button */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleNavigate('Mood')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#50C878', '#3FAA62']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <MaterialCommunityIcons name="emoticon-happy-outline" size={32} color="#FFF" />
                <Text style={styles.actionCardText}>Track Mood</Text>
                <Text style={styles.actionCardSubtext}>Check in</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mood Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Mood</Text>
          
          <View style={styles.moodCard}>
            {lastMood ? (
              <View style={styles.moodContent}>
                <Text style={styles.moodEmoji}>{getMoodEmoji(lastMood.mood)}</Text>
                <View style={styles.moodTextContainer}>
                  <Text style={styles.moodLabel}>{lastMood.mood}</Text>
                  <Text style={styles.moodTime}>
                    {new Date(lastMood.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyMoodContainer}>
                <Ionicons name="sad-outline" size={32} color="#999" />
                <Text style={styles.emptyMoodText}>No mood recorded yet</Text>
                <Text style={styles.emptyMoodSubtext}>Start tracking to see insights</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => handleNavigate('Chat')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentChats.length > 0 ? (
            <View>
              {recentChats.slice(0, 2).map((chat, index) => (
                <View key={chat.id}>
                  <TouchableOpacity
                    style={styles.activityItem}
                    onPress={() => handleNavigate('Chat')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.activityIcon}>
                      <MaterialCommunityIcons name="chat-outline" size={20} color="#4A90E2" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityPreview} numberOfLines={1}>
                        {chat.preview}
                      </Text>
                      <Text style={styles.activityTime}>{chat.time}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  </TouchableOpacity>
                  {index < recentChats.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyActivityContainer}>
              <Text style={styles.emptyActivityText}>No recent activity</Text>
              <Text style={styles.emptyActivitySubtext}>Start a chat to see your conversations</Text>
            </View>
          )}
        </View>

        {/* Wellness Tips Section */}
        <View style={[styles.section, styles.sectionLast]}>
          <Text style={styles.sectionTitle}>Daily Tip</Text>
          
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb" size={28} color="#FFD700" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Mindful Breathing</Text>
              <Text style={styles.tipDescription}>
                Take 5 deep breaths: inhale for 4 counts, hold for 4, exhale for 4.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  
  // Header Section
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingSection: {
    flex: 1,
    paddingRight: 16,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  subgreeting: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    lineHeight: 20,
  },
  profileButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },

  // Sections
  section: {
    paddingHorizontal: 18,
    marginTop: 28,
  },
  sectionLast: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1C3A5C',
    marginBottom: 16,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '700',
  },

  // Quick Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  actionCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },
  actionCardGradient: {
    paddingVertical: 28,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
  },
  actionCardText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  actionCardSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Mood Card
  moodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  moodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  moodEmoji: {
    fontSize: 44,
  },
  moodTextContainer: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C3A5C',
    textTransform: 'capitalize',
    lineHeight: 22,
  },
  moodTime: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
  },
  emptyMoodContainer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyMoodText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    marginTop: 14,
  },
  emptyMoodSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
    textAlign: 'center',
  },

  // Recent Activity
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E8F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityPreview: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 14,
  },
  emptyActivityContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 28,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyActivityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  emptyActivitySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },

  // Wellness Tip
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#FFD700',
  },
  tipIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FFFAF0',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C3A5C',
    marginBottom: 6,
    lineHeight: 20,
  },
  tipDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    fontWeight: '500',
  },
});

export default HomeScreen;
