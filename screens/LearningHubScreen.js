import React, { useState } from 'react';
import { DeviceEventEmitter, View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Dimensions, StatusBar } from 'react-native';
import { Search, SlidersHorizontal, Brain, BookOpen, Star, Trophy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { 
  FeaturedCard, CategoryChip, RecommendedCard, VideoCard, 
  ArticleCard, CBTCard, MeditationCard, StreakWidget, 
  AchievementBadge, FloatingBottomNav 
} from '../components/ui/Premium/LearningHubCards';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#0B1220',
  surface: '#1E293B',
  primary: '#3B82F6',
  text: '#FFFFFF',
  textMuted: '#94A3B8',
};

const CATEGORIES = [
  'All', 'Videos', 'Articles', 'CBT', 'Meditation', 'Stress', 'Burnout', 
  'Sleep', 'Anxiety', 'Mindfulness', 'Depression'
];

export default function LearningHubScreen() {
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('LearningHub');

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    if (tab === 'Home') navigation.navigate('Home');
    if (tab === 'Chat') navigation.navigate('Chat');
    if (tab === 'Mood') navigation.navigate('Mood');
    if (tab === 'Profile') navigation.navigate('Profile');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Learning Hub</Text>
              <Text style={styles.subtitle}>Evidence-based resources for a healthier mind.</Text>
            </View>
            <View style={styles.iconContainer}>
              <Brain size={28} color={COLORS.primary} />
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Search size={20} color={COLORS.textMuted} style={styles.searchIcon} />
              <TextInput 
                placeholder="Search topics, articles, videos..."
                placeholderTextColor={COLORS.textMuted}
                style={styles.searchInput}
              />
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <SlidersHorizontal size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Featured */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Today</Text>
          <FeaturedCard 
            title="Understanding Anxiety"
            readingTime="6"
            image="https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=600&auto=format&fit=crop"
            onPress={() => {}}
          />
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <CategoryChip 
                key={cat}
                title={cat}
                isSelected={activeCategory === cat}
                onPress={() => setActiveCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Recommended */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            <RecommendedCard 
              title="5 Minute Breathing Exercise"
              desc="A quick way to reset your nervous system and find calm."
              difficulty="Beginner"
              duration="5m"
              image="https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=400&auto=format&fit=crop"
              delay={0}
            />
            <RecommendedCard 
              title="Better Sleep Habits"
              desc="Learn how to optimize your environment for restorative rest."
              difficulty="Intermediate"
              duration="12m"
              image="https://images.unsplash.com/photo-1511295742362-92c96b124e41?q=80&w=400&auto=format&fit=crop"
              delay={200}
            />
          </ScrollView>
        </View>

        {/* Video Library */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Library</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            <VideoCard 
              title="Managing Panic Attacks"
              instructor="Dr. Sarah Jenkins"
              views="12K"
              duration="14:20"
              image="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=400&auto=format&fit=crop"
            />
            <VideoCard 
              title="Mindfulness Basics"
              instructor="Alex Rivers"
              views="8.5K"
              duration="8:45"
              image="https://images.unsplash.com/photo-1528315651484-4dbe277c2299?q=80&w=400&auto=format&fit=crop"
            />
          </ScrollView>
        </View>

        {/* CBT Center */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CBT Learning Center</Text>
          <View style={styles.verticalList}>
            <CBTCard title="Reframing Negative Thinking" progress={45} />
            <CBTCard title="Cognitive Distortions" progress={10} />
            <CBTCard title="Behavioural Activation" progress={0} />
          </View>
        </View>

        {/* Articles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evidence-Based Articles</Text>
          <View style={styles.verticalList}>
            <ArticleCard 
              title="How Stress Affects the Brain"
              summary="Discover the neurological changes that occur during chronic stress periods and how to reverse them."
              readTime="8 min"
            />
            <ArticleCard 
              title="Recognizing Depression Early"
              summary="Key signs that you might be slipping into a depressive episode and proactive steps to take."
              readTime="10 min"
            />
          </View>
        </View>

        {/* Guided Meditation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guided Meditation</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            <MeditationCard title="Deep Relaxation" duration="15m" />
            <MeditationCard title="Morning Calm" duration="10m" />
            <MeditationCard title="Focus & Clarity" duration="20m" />
          </ScrollView>
        </View>

        {/* Therapist Integration */}
        <View style={[styles.section, { paddingBottom: 100 }]}>
          <Text style={styles.sectionTitle}>Therapist Integration</Text>
          <TouchableOpacity 
            style={[styles.searchBar, { marginBottom: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('TherapistHub')}
          >
            <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>View Therapist Hub</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.searchBar, { backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('NearbyTherapists')}
          >
            <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Find Nearby Therapists</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Custom Bottom Nav overlay */}
      <FloatingBottomNav activeTab={activeTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    maxWidth: '85%',
    lineHeight: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  filterBtn: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  categoryScroll: {
    paddingRight: 20,
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  verticalList: {
    gap: 12,
  }
});
