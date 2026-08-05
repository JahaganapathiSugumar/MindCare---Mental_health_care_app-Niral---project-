import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import PremiumBreathingCircle from '../components/PremiumBreathingCircle';
import { saveExerciseActivity } from '../services/activityService';
import { ensureAuthInitialized, getAuth_ } from '../firebase';
import TopBackButton from '../components/ui/Premium/TopBackButton';

const EXERCISES = [
  { id: 'box', title: 'Box Breathing', subtitle: '4-4-4-4 Pattern', durationStr: '2 min', difficulty: 'Beginner', benefits: 'Focus & Calm', pattern: [4, 4, 4, 4], targetCycles: 8, color: '#4FC3F7', icon: 'square-outline' },
  { id: '478', title: '4-7-8 Relaxation', subtitle: 'Deep Rest', durationStr: '3 min', difficulty: 'Intermediate', benefits: 'Sleep & Anxiety', pattern: [4, 7, 8], targetCycles: 10, color: '#69F0AE', icon: 'moon-waning-crescent' },
  { id: 'calm', title: 'Calm Breathing', subtitle: '4-4-6 Pattern', durationStr: '3 min', difficulty: 'Beginner', benefits: 'Stress Relief', pattern: [4, 4, 6], targetCycles: 12, color: '#B388FF', icon: 'leaf' },
  { id: 'deep', title: 'Deep Relaxation', subtitle: '5 Minute Session', durationStr: '5 min', difficulty: 'Advanced', benefits: 'Nervous System Reset', pattern: [5, 5, 5, 5], targetCycles: 15, color: '#FF8A80', icon: 'spa' },
  { id: 'panic', title: 'Panic Relief', subtitle: 'Quick 60 Second', durationStr: '1 min', difficulty: 'Beginner', benefits: 'Immediate Grounding', pattern: [3, 0, 3], targetCycles: 10, color: '#FFD54F', icon: 'lightning-bolt' }
];

export default function GuidedBreathingScreen({ navigation }) {
  const [view, setView] = useState('home'); // 'home' | 'exercise' | 'complete'
  const [selectedExercise, setSelectedExercise] = useState(null);
  
  // Exercise State
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  // Background Audio UI state (Mock for now since we lack audio files)
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

  const renderHome = () => (
    <Animated.ScrollView entering={FadeIn} exiting={FadeOut} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Hero Mascot */}
      <View style={styles.heroSection}>
        <View style={styles.mascotContainer}>
          <LinearGradient colors={['rgba(96, 165, 250, 0.2)', 'rgba(96, 165, 250, 0.0)']} style={styles.mascotGlow} />
          <MaterialCommunityIcons name="robot-happy-outline" size={72} color="#60A5FA" />
        </View>
        <Text style={styles.heroTitle}>Guided Breathing</Text>
        <Text style={styles.heroSubtitle}>"Take a deep breath. Let's slow down together."</Text>
      </View>

      {/* Exercise Cards */}
      <View style={styles.cardsGrid}>
        {EXERCISES.map((ex, index) => (
          <Animated.View key={ex.id} entering={FadeInDown.delay(index * 100).duration(500)}>
            <TouchableOpacity style={styles.card} onPress={() => handleStartExercise(ex)} activeOpacity={0.8}>
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.01)']} style={styles.cardGradient}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: `${ex.color}20` }]}>
                    <MaterialCommunityIcons name={ex.icon} size={28} color={ex.color} />
                  </View>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.cardTitle}>{ex.title}</Text>
                    <Text style={styles.cardSubtitle}>{ex.subtitle}</Text>
                  </View>
                </View>
                
                <View style={styles.cardStatsRow}>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color="#94A3B8" />
                    <Text style={styles.statText}>{ex.durationStr}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="signal" size={14} color="#94A3B8" />
                    <Text style={styles.statText}>{ex.difficulty}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="star-outline" size={14} color="#94A3B8" />
                    <Text style={styles.statText}>{ex.benefits}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.ScrollView>
  );

  const renderExercise = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.exerciseContainer}>
      <View style={styles.exerciseHeader}>
        <TouchableOpacity onPress={() => setView('home')} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={28} color="#E2E8F0" />
        </TouchableOpacity>
        <Text style={styles.exerciseTitle}>{selectedExercise?.title}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Progress Ring / Info */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Cycle {cyclesCompleted} of {selectedExercise?.targetCycles}</Text>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: `${(cyclesCompleted / selectedExercise?.targetCycles) * 100}%`, backgroundColor: selectedExercise?.color }]} />
        </View>
      </View>

      {/* Breathing Circle Component */}
      <View style={styles.circleWrapper}>
        <PremiumBreathingCircle 
          pattern={selectedExercise?.pattern}
          isActive={isActive}
          isPaused={isPaused}
          onCycleComplete={handleCycleComplete}
          color={selectedExercise?.color}
        />
      </View>

      {/* Audio Selection (Mock UI) */}
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

      {/* Bottom Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.playButton, { backgroundColor: selectedExercise?.color }]} onPress={togglePlayback}>
          <MaterialCommunityIcons name={!isActive ? 'play' : (isPaused ? 'play' : 'pause')} size={36} color="#0B132B" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.restartButton} onPress={() => { setCyclesCompleted(0); setIsActive(true); setIsPaused(false); }}>
          <MaterialCommunityIcons name="restart" size={28} color="#E2E8F0" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderComplete = () => {
    const timeSpent = cyclesCompleted * (selectedExercise?.pattern.reduce((a,b)=>a+b,0) || 12);
    
    return (
      <Animated.View entering={FadeIn} style={styles.completeContainer}>
        <View style={styles.completeHero}>
          <MaterialCommunityIcons name="party-popper" size={64} color="#69F0AE" />
          <Text style={styles.completeTitle}>Excellent Work</Text>
          <Text style={styles.completeSubtitle}>You completed today's breathing exercise.</Text>
        </View>

        <View style={styles.statsCard}>
          <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={styles.statsGradient}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{timeSpent} seconds</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Stress Relief</Text>
              <Text style={styles.statValue}>High</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cycles Completed</Text>
              <Text style={styles.statValue}>{cyclesCompleted}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.reflectionCard}>
          <MaterialCommunityIcons name="robot-outline" size={24} color="#60A5FA" style={{ marginBottom: 8 }} />
          <Text style={styles.reflectionText}>
            "You slowed your breathing and completed {cyclesCompleted} cycles. Regular breathing practice helps reduce stress and improves focus over time."
          </Text>
        </View>

        <View style={styles.completeActions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndExit}>
            <Text style={styles.saveButtonText}>Save Session & Home</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
        <TopBackButton fallbackRoute="Home" />
      {view === 'home' && (
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backNav} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#E2E8F0" />
            <Text style={styles.backNavText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {view === 'home' && renderHome()}
      {view === 'exercise' && renderExercise()}
      {view === 'complete' && renderComplete()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
  },
  backNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backNavText: {
    color: '#E2E8F0',
    fontSize: 16,
    marginLeft: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  mascotContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mascotGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  cardsGrid: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  cardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12,
    borderRadius: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#CBD5E1',
    fontSize: 12,
    marginLeft: 6,
  },
  
  // Exercise View
  exerciseContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressBarBg: {
    width: 200,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    marginBottom: 30,
  },
  audioLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 10,
    marginLeft: 4,
  },
  audioScroll: {
    gap: 10,
  },
  audioChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 10,
  },
  audioChipText: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  audioChipTextActive: {
    color: '#0B132B',
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  endButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  endButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  restartButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Complete View
  completeContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  completeHero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  completeTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 20,
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  statsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  statsGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 16,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  statDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  reflectionCard: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
    marginBottom: 40,
  },
  reflectionText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  completeActions: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#60A5FA',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#0B132B',
    fontSize: 16,
    fontWeight: '700',
  }
});
