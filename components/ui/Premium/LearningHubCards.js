import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Bookmark, Clock, CheckCircle, Headphones, Award, Flame, Calendar, BookOpen, Brain, MoreHorizontal, ArrowRight, Video } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Colors
const COLORS = {
  bg: '#0B1220',
  surface: '#1E293B',
  primary: '#3B82F6',
  accent: '#38BDF8',
  purple: '#8B5CF6',
  green: '#22C55E',
  text: '#FFFFFF',
  textMuted: '#94A3B8',
  border: 'rgba(0, 0, 0, 0.1)',
};

// 1. Featured Banner Card
export const FeaturedCard = ({ title, readingTime, image, onPress }) => (
  <Animated.View entering={FadeInUp.delay(100).duration(500)}>
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <LinearGradient
        colors={['#1E293B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featuredCard}
      >
        <Image source={{ uri: image }} style={styles.featuredImage} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(15, 23, 42, 0.9)']}
          style={styles.featuredOverlay}
        >
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Beginner Friendly</Text>
            </View>
          </View>
          
          <Text style={styles.featuredTitle}>{title}</Text>
          
          <View style={styles.featuredMeta}>
            <View style={styles.metaItem}>
              <Clock size={14} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{readingTime} min</Text>
            </View>
            <View style={styles.metaActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Bookmark size={18} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}>
                <Play size={18} color={COLORS.text} fill={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '30%' }]} />
            </View>
          </View>
        </LinearGradient>
      </LinearGradient>
    </TouchableOpacity>
  </Animated.View>
);

// 2. Category Chips
export const CategoryChip = ({ title, isSelected, onPress }) => (
  <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
    {isSelected ? (
      <LinearGradient
        colors={[COLORS.primary, '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.chip, styles.chipSelected]}
      >
        <Text style={[styles.chipText, styles.chipTextSelected]}>{title}</Text>
      </LinearGradient>
    ) : (
      <View style={styles.chip}>
        <Text style={styles.chipText}>{title}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// 3. Recommended Card
export const RecommendedCard = ({ title, desc, difficulty, duration, image, delay = 0 }) => (
  <Animated.View entering={FadeInRight.delay(delay).duration(400)}>
    <TouchableOpacity activeOpacity={0.8} style={styles.recCard}>
      <Image source={{ uri: image }} style={styles.recImage} />
      <View style={styles.recContent}>
        <View style={styles.recHeader}>
          <Text style={styles.recCategory}>{difficulty}</Text>
          <View style={styles.metaItem}>
            <Clock size={12} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{duration}</Text>
          </View>
        </View>
        <Text style={styles.recTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.recDesc} numberOfLines={2}>{desc}</Text>
      </View>
    </TouchableOpacity>
  </Animated.View>
);

// 4. Video Card
export const VideoCard = ({ title, instructor, duration, views, image }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.videoCard}>
    <View style={styles.videoThumbnailContainer}>
      <Image source={{ uri: image }} style={styles.videoImage} />
      <View style={styles.videoOverlay}>
        <View style={styles.playButton}>
          <Play size={20} color={COLORS.text} fill={COLORS.text} />
        </View>
      </View>
      <View style={styles.videoDuration}>
        <Text style={styles.videoDurationText}>{duration}</Text>
      </View>
    </View>
    <View style={styles.videoInfo}>
      <Text style={styles.videoTitle} numberOfLines={2}>{title}</Text>
      <Text style={styles.videoInstructor}>{instructor}</Text>
      <Text style={styles.videoViews}>{views} views</Text>
    </View>
  </TouchableOpacity>
);

// 5. Article Card
export const ArticleCard = ({ title, summary, readTime }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.articleCard}>
    <View style={styles.articleHeader}>
      <View style={styles.tagEvidence}>
        <CheckCircle size={12} color={COLORS.green} />
        <Text style={styles.tagEvidenceText}>Evidence-Based</Text>
      </View>
      <Bookmark size={18} color={COLORS.textMuted} />
    </View>
    <Text style={styles.articleTitle}>{title}</Text>
    <Text style={styles.articleSummary} numberOfLines={2}>{summary}</Text>
    <View style={styles.metaItem}>
      <Clock size={14} color={COLORS.textMuted} />
      <Text style={styles.metaText}>{readTime} read</Text>
    </View>
  </TouchableOpacity>
);

// 6. CBT Lesson Card
export const CBTCard = ({ title, progress }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.cbtCard}>
    <LinearGradient
      colors={['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.05)']}
      style={styles.cbtGradient}
    >
      <View style={styles.cbtIconContainer}>
        <Brain size={24} color={COLORS.purple} />
      </View>
      <View style={styles.cbtContent}>
        <Text style={styles.cbtTitle}>{title}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: COLORS.purple }]} />
        </View>
      </View>
      <TouchableOpacity style={styles.cbtAction}>
        <ArrowRight size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    </LinearGradient>
  </TouchableOpacity>
);

// 7. Meditation Card
export const MeditationCard = ({ title, duration }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.meditationCard}>
    <LinearGradient
      colors={['#1E293B', '#0F172A']}
      style={styles.meditationGradient}
    >
      <View style={styles.meditationIcon}>
        <Headphones size={24} color={COLORS.accent} />
      </View>
      <Text style={styles.meditationTitle}>{title}</Text>
      <View style={styles.meditationMeta}>
        <Text style={styles.metaText}>{duration}</Text>
        <View style={styles.meditationBadge}>
          <Text style={styles.meditationBadgeText}>Female Voice</Text>
        </View>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

// 8. Streak Widget
export const StreakWidget = ({ currentStreak, longestStreak, todayMinutes }) => (
  <View style={styles.streakWidget}>
    <View style={styles.streakHeader}>
      <View style={styles.streakInfo}>
        <Text style={styles.streakTitle}>Daily Learning</Text>
        <Text style={styles.streakSubtitle}>You're on a roll!</Text>
      </View>
      <View style={styles.streakFlame}>
        <Flame size={28} color="#F59E0B" fill="#F59E0B" />
        <Text style={styles.streakCount}>{currentStreak}</Text>
      </View>
    </View>
    <View style={styles.streakStats}>
      <View style={styles.streakStat}>
        <Text style={styles.statValue}>{todayMinutes}m</Text>
        <Text style={styles.statLabel}>Today</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.streakStat}>
        <Text style={styles.statValue}>{longestStreak}</Text>
        <Text style={styles.statLabel}>Best Streak</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.streakStat}>
        <Text style={styles.statValue}>4/7</Text>
        <Text style={styles.statLabel}>Week Goal</Text>
      </View>
    </View>
  </View>
);

// 9. Achievement Badge
export const AchievementBadge = ({ title, icon: IconComponent, color, isUnlocked }) => (
  <View style={[styles.achievementBadge, !isUnlocked && styles.achievementLocked]}>
    <View style={[styles.achievementIconBox, { backgroundColor: isUnlocked ? `${color}20` : '#333' }]}>
      <IconComponent size={24} color={isUnlocked ? color : '#666'} />
    </View>
    <Text style={styles.achievementTitle}>{title}</Text>
  </View>
);


// 10. Floating Bottom Nav
export const FloatingBottomNav = ({ activeTab = 'Home', onTabPress }) => {
  const tabs = [
    { id: 'Home', icon: BookOpen, label: 'Home' },
    { id: 'Chat', icon: Brain, label: 'Chat' },
    { id: 'LearningHub', icon: Video, label: 'Learn' },
    { id: 'WellnessDashboard', icon: Flame, label: 'Progress' },
    { id: 'TherapistHub', icon: Calendar, label: 'Therapist' },
  ];

  return (
    <View style={styles.bottomNavContainer}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.95)', 'rgba(240, 244, 248, 0.98)']}
        style={styles.bottomNav}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity 
              key={tab.id} 
              style={styles.navItem}
              onPress={() => onTabPress?.(tab.id)}
            >
              <tab.icon size={24} color={isActive ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.navText, isActive && styles.navTextActive]}>
                {tab.label || tab.id}
              </Text>
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
};


const styles = StyleSheet.create({
  // Shared
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  progressBar: { height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  
  // Featured
  featuredCard: { width: width - 40, height: 220, borderRadius: 24, overflow: 'hidden', marginVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  featuredImage: { width: '100%', height: '100%', position: 'absolute' },
  featuredOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  badgeContainer: { flexDirection: 'row', marginBottom: 12 },
  badge: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  featuredTitle: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  featuredMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  metaActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  progressContainer: { width: '100%' },

  // Chips
  chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.surface, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  chipSelected: { borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: COLORS.text },

  // Recommended
  recCard: { width: 260, backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden', marginRight: 15, borderWidth: 1, borderColor: COLORS.border },
  recImage: { width: '100%', height: 120 },
  recContent: { padding: 15 },
  recHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  recCategory: { color: COLORS.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  recTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  recDesc: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },

  // Video
  videoCard: { width: 220, marginRight: 15 },
  videoThumbnailContainer: { width: '100%', height: 130, borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  videoImage: { width: '100%', height: '100%' },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  videoDuration: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  videoDurationText: { color: COLORS.text, fontSize: 11, fontWeight: 'bold' },
  videoTitle: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  videoInstructor: { color: COLORS.textMuted, fontSize: 12, marginBottom: 2 },
  videoViews: { color: COLORS.textMuted, fontSize: 11 },

  // Article
  articleCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  articleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tagEvidence: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagEvidenceText: { color: COLORS.green, fontSize: 11, fontWeight: 'bold' },
  articleTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  articleSummary: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 },

  // CBT
  cbtCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)' },
  cbtGradient: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 15 },
  cbtIconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(139, 92, 246, 0.2)', alignItems: 'center', justifyContent: 'center' },
  cbtContent: { flex: 1 },
  cbtTitle: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  cbtAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },

  // Meditation
  meditationCard: { width: 140, marginRight: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  meditationGradient: { padding: 16, alignItems: 'flex-start' },
  meditationIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(56, 189, 248, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  meditationTitle: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  meditationMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  meditationBadge: { backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  meditationBadgeText: { color: COLORS.text, fontSize: 9, fontWeight: '600' },

  // Streak
  streakWidget: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  streakTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  streakSubtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  streakFlame: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  streakCount: { color: '#F59E0B', fontSize: 20, fontWeight: '900' },
  streakStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakStat: { alignItems: 'center', flex: 1 },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: COLORS.textMuted, fontSize: 11 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  // Badge
  achievementBadge: { alignItems: 'center', width: 90, marginRight: 10 },
  achievementLocked: { opacity: 0.5 },
  achievementIconBox: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)' },
  achievementTitle: { color: COLORS.text, fontSize: 11, textAlign: 'center', fontWeight: '500' },

  // Bottom Nav
  bottomNavContainer: { position: 'absolute', bottom: 20, left: 20, right: 20, alignItems: 'center', zIndex: 100 },
  bottomNav: { flexDirection: 'row', width: '100%', height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'space-evenly', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' },
  navText: { color: COLORS.textMuted, fontSize: 10, marginTop: 4, fontWeight: '500' },
  navTextActive: { color: COLORS.primary, fontWeight: 'bold' },
});
