import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import PremiumBreathingCircle from '../components/PremiumBreathingCircle';
import { saveExerciseActivity } from '../services/activityService';
import { ensureAuthInitialized, getAuth_ } from '../firebase';
import TopBackButton from '../components/ui/Premium/TopBackButton';

// Light color scheme
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
  purple: '#8E44AD',
  pink: '#FF6B9D',
};

const EXERCISES = [
  { id: 'box', title: 'Box Breathing', subtitle: '4-4-4-4 Pattern', durationStr: '2 min', difficulty: 'Beginner', benefits: 'Focus & Calm', pattern: [4, 4, 4, 4], targetCycles: 8, color: '#4FC3F7', icon: 'square-outline' },
  { id: '478', title: '4-7-8 Relaxation', subtitle: 'Deep Rest', durationStr: '3 min', difficulty: 'Intermediate', benefits: 'Sleep & Anxiety', pattern: [4, 7, 8], targetCycles: 10, color: '#69F0AE', icon: 'moon-waning-crescent' },
  { id: 'calm', title: 'Calm Breathing', subtitle: '4-4-6 Pattern', durationStr: '3 min', difficulty: 'Beginner', benefits: 'Stress Relief', pattern: [4, 4, 6], targetCycles: 12, color: '#B388FF', icon: 'leaf' },
  { id: 'deep', title: 'Deep Relaxation', subtitle: '5 Minute Session', durationStr: '5 min', difficulty: 'Advanced', benefits: 'Nervous System Reset', pattern: [5, 5, 5, 5], targetCycles: 15, color: '#FF8A80', icon: 'spa' },
  { id: 'panic', title: 'Panic Relief', subtitle: 'Quick 60 Second', durationStr: '1 min', difficulty: 'Beginner', benefits: 'Immediate Grounding', pattern: [3, 0, 3], targetCycles: 10, color: '#FFD54F', icon: 'lightning-bolt' }
];

export default function GuidedBreathingScreen({ navigation }) {
  const [view, setView] = useState('home');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [selectedAudio, setSelectedAudio] = useState('None');

  const handleStartExercise = (exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedExercise(exercise);
    setCyclesCompleted(0);
    setIsActive(false);
    setIsPaused(false);
    setView('exercise');
  };

  const togglePlayback = () => {
    Haptics.selectionAsync();
    if (!isActive) {
      setIsActive(true);
      setIsPaused(false);
    } else {
      setIsPaused(!isPaused);
    }
  };

  const handleEndSession = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIsActive(false);
    setView('complete');
  };

  const handleCycleComplete = () => {
    setCyclesCompleted(prev => {
      const next = prev + 1;
      if (next >= selectedExercise.targetCycles) {
        setTimeout(() => handleEndSession(), 1000);
      }
      return next;
    });
  };

  const handleSaveAndExit = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const auth = await ensureAuthInitialized();
      const user = getAuth_()?.currentUser;

      if (user && cyclesCompleted > 0) {
        await saveExerciseActivity(user.uid, {
          type: 'breathing',
          pattern: selectedExercise.id,
          duration: cyclesCompleted * selectedExercise.pattern.reduce((a, b) => a + b, 0),
          cyclesCompleted: cyclesCompleted,
          completed: true,
        });
      }
    } catch (e) {
      console.warn('Could not save breathing session to Firebase', e);
    } finally {
      navigation.goBack();
    }
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedExercise(null);
    setCyclesCompleted(0);
    setIsActive(false);
    setIsPaused(false);
  };

  const renderHome = () => (
    <Animated.ScrollView entering={FadeIn} exiting={FadeOut} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={{height:80}}></Text>
          <Text style={styles.headerTitle}>🌬️ Guided Breathing</Text>
          <Text style={styles.headerSubtitle}>Take a deep breath. Let's slow down together.</Text>
        </View>
      </View>

      {/* Exercise Cards */}
      <View style={styles.cardsGrid}>
        {EXERCISES.map((ex, index) => (
          <Animated.View key={ex.id} entering={FadeInDown.delay(index * 100).duration(500)}>
            <TouchableOpacity 
              style={[styles.card, { borderLeftColor: ex.color }]} 
              onPress={() => handleStartExercise(ex)} 
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: `${ex.color}20` }]}>
                  <MaterialCommunityIcons name={ex.icon} size={24} color={ex.color} />
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardTitle}>{ex.title}</Text>
                  <Text style={styles.cardSubtitle}>{ex.subtitle}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
              </View>
              
              <View style={styles.cardStatsRow}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.textLight} />
                  <Text style={styles.statText}>{ex.durationStr}</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={[styles.difficultyBadge, { backgroundColor: ex.difficulty === 'Beginner' ? `${COLORS.success}15` : ex.difficulty === 'Intermediate' ? `${COLORS.warning}15` : `${COLORS.danger}15` }]}>
                    <Text style={[styles.difficultyText, { color: ex.difficulty === 'Beginner' ? COLORS.success : ex.difficulty === 'Intermediate' ? COLORS.warning : COLORS.danger }]}>
                      {ex.difficulty}
                    </Text>
                  </View>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="star-outline" size={14} color={COLORS.textLight} />
                  <Text style={styles.statText}>{ex.benefits}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.ScrollView>
  );

  const renderExercise = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.exerciseContainer}>
      <View style={styles.exerciseHeader}>
        <TouchableOpacity onPress={handleBackToHome} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.exerciseTitle}>{selectedExercise?.title}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Cycle {cyclesCompleted} of {selectedExercise?.targetCycles}</Text>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: `${(cyclesCompleted / selectedExercise?.targetCycles) * 100}%`, backgroundColor: selectedExercise?.color }]} />
        </View>
      </View>

      <View style={styles.circleWrapper}>
        <PremiumBreathingCircle 
          pattern={selectedExercise?.pattern}
          isActive={isActive}
          isPaused={isPaused}
          onCycleComplete={handleCycleComplete}
          color={selectedExercise?.color}
        />
      </View>

      <View style={styles.audioSelection}>
        <Text style={styles.audioLabel}>Background Sound</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.audioScroll}>
          {['None', 'Nature', 'Rain', 'Ocean', 'Forest'].map(audio => (
            <TouchableOpacity 
              key={audio} 
              style={[styles.audioChip, selectedAudio === audio && { backgroundColor: selectedExercise?.color }]}
              onPress={() => setSelectedAudio(audio)}
            >
              <Text style={[styles.audioChipText, selectedAudio === audio && styles.audioChipTextActive]}>{audio}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.playButton, { backgroundColor: selectedExercise?.color }]} onPress={togglePlayback}>
          <MaterialCommunityIcons name={!isActive ? 'play' : (isPaused ? 'play' : 'pause')} size={36} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.restartButton} onPress={() => { setCyclesCompleted(0); setIsActive(true); setIsPaused(false); }}>
          <MaterialCommunityIcons name="restart" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderComplete = () => {
    const timeSpent = cyclesCompleted * (selectedExercise?.pattern.reduce((a,b)=>a+b,0) || 12);
    
    return (
      <Animated.View entering={FadeIn} style={styles.completeContainer}>
        <View style={styles.completeHero}>
          <View style={styles.completeIconWrap}>
            <MaterialCommunityIcons name="party-popper" size={56} color={COLORS.primary} />
          </View>
          <Text style={styles.completeTitle}>Excellent Work!</Text>
          <Text style={styles.completeSubtitle}>You completed today's breathing exercise.</Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statItemWrapper}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{timeSpent}s</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItemWrapper}>
              <Text style={styles.statLabel}>Stress Relief</Text>
              <Text style={[styles.statValue, { color: COLORS.success }]}>High</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItemWrapper}>
              <Text style={styles.statLabel}>Cycles</Text>
              <Text style={styles.statValue}>{cyclesCompleted}</Text>
            </View>
          </View>
        </View>

        <View style={styles.reflectionCard}>
          <MaterialCommunityIcons name="robot-outline" size={24} color={COLORS.primary} />
          <Text style={styles.reflectionText}>
            You slowed your breathing and completed {cyclesCompleted} cycles. Regular breathing practice helps reduce stress and improves focus over time.
          </Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndExit}>
          <Text style={styles.saveButtonText}>Save Session & Home</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <TopBackButton fallbackRoute="Home" />
      
      {view === 'home' && renderHome()}
      {view === 'exercise' && renderExercise()}
      {view === 'complete' && renderComplete()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
    fontStyle: 'italic',
  },
  cardsGrid: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  cardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${COLORS.background}50`,
    padding: 10,
    borderRadius: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: COLORS.textLight,
    fontSize: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Exercise View
  exerciseContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  progressText: {
    color: COLORS.textLight,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressBarBg: {
    width: 200,
    height: 6,
    backgroundColor: `${COLORS.textLight}20`,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  circleWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioSelection: {
    marginBottom: 20,
  },
  audioLabel: {
    color: COLORS.textLight,
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  audioScroll: {
    gap: 8,
  },
  audioChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  audioChipText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '500',
  },
  audioChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  endButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: `${COLORS.danger}10`,
    borderWidth: 1,
    borderColor: `${COLORS.danger}30`,
  },
  endButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  restartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Complete View
  completeContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 20,
    justifyContent: 'center',
  },
  completeHero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  completeIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  completeSubtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItemWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  reflectionCard: {
    backgroundColor: `${COLORS.primary}08`,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}15`,
    marginBottom: 32,
    gap: 8,
  },
  reflectionText: {
    color: COLORS.textLight,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});