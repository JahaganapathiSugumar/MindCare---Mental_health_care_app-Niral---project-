import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import BreathingCircle from '../components/BreathingCircle';
import GroundingSteps from '../components/GroundingSteps';
import { saveExerciseActivity } from '../services/activityService';
import { ensureAuthInitialized, getAuth_ } from '../firebase';
import TopBackButton from '../components/ui/Premium/TopBackButton';

const { width } = Dimensions.get('window');

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

/**
 * Exercise Screen - Guided Breathing & Grounding Exercises
 * 
 * Features:
 * - Multiple breathing patterns (4-4-6, 4-7-8)
 * - 5-4-3-2-1 grounding exercise
 * - Smooth animations
 * - Mood tracking before/after
 * - Data persistence to Firestore
 */
const ExerciseScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const [screen, setScreen] = useState('menu'); // 'menu' | 'breathing' | 'grounding' | 'complete'
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [isBreathing, setIsBreathing] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [maxCycles, setMaxCycles] = useState(5);
  const [beforeMood, setBeforeMood] = useState(route?.params?.mood || null);
  const [afterMood, setAfterMood] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Breathing patterns configuration
  const breathingPatterns = [
    {
      id: 'calm',
      name: 'Calm Breathing',
      pattern: '4-4-6',
      level: 'Beginner',
      duration: 60,
      description: '4s inhale → 4s hold → 6s exhale',
      cycles: 5,
      color: COLORS.primary,
      emoji: '🌬️',
    },
    {
      id: 'deep',
      name: 'Deep Calm',
      pattern: '4-7-8',
      level: 'Intermediate',
      duration: 90,
      description: '4s inhale → 7s hold → 8s exhale',
      cycles: 4,
      color: COLORS.success,
      emoji: '🧘',
    },
  ];

  // Handle breathing start/stop
  const handleBreathingToggle = () => {
    if (isBreathing) {
      setIsBreathing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setIsBreathing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle cycle completion
  const handleCycleComplete = () => {
    const newCycle = cycleCount + 1;
    setCycleCount(newCycle);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (newCycle >= maxCycles) {
      setTimeout(() => {
        handleBreathingComplete();
      }, 1000);
    }
  };

  // Complete breathing exercise
  const handleBreathingComplete = async () => {
    setIsBreathing(false);
    await saveBreathingActivity();
    setScreen('complete');
  };

  // Save breathing activity to Firestore
  const saveBreathingActivity = async () => {
    try {
      setSaving(true);
      const auth = await ensureAuthInitialized();
      const user = getAuth_()?.currentUser;

      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const pattern = breathingPatterns.find((p) => p.pattern === selectedPattern);

      await saveExerciseActivity(user.uid, {
        type: 'breathing',
        pattern: selectedPattern,
        duration: elapsedTime,
        beforeMood,
        afterMood,
        cyclesCompleted: cycleCount,
        completed: true,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[ExerciseScreen] Error saving activity:', error);
      Alert.alert('Error', 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  // Save grounding activity to Firestore
  const saveGroundingActivity = async (responses) => {
    try {
      setSaving(true);
      const auth = await ensureAuthInitialized();
      const user = getAuth_()?.currentUser;

      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      await saveExerciseActivity(user.uid, {
        type: 'grounding',
        pattern: 'grounding-5-4-3-2-1',
        duration: elapsedTime,
        beforeMood,
        afterMood,
        completed: true,
        notes: JSON.stringify(responses),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[ExerciseScreen] Error saving grounding:', error);
      Alert.alert('Error', 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  // Handle grounding completion
  const handleGroundingComplete = async (responses) => {
    await saveGroundingActivity(responses);
    setScreen('complete');
  };

  // Handle reset to menu
  const handleBackToMenu = () => {
    fadeAnim.setValue(1);
    setScreen('menu');
    setSelectedPattern(null);
    setIsBreathing(false);
    setCycleCount(0);
    setElapsedTime(0);
    setAfterMood(null);
  };

  // Screen transitions with fade animation
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [screen, fadeAnim]);

  // Render Menu Screen
  if (screen === 'menu') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <TopBackButton fallbackRoute="Home" />
        
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>🧘 Wellness Exercises</Text>
              <Text style={styles.headerSubtitle}>Calm your mind and body</Text>
            </View>
          </View>

          {/* Current mood indicator */}
          {beforeMood && (
            <View style={styles.moodCard}>
              <MaterialCommunityIcons name="emoticon-happy" size={20} color={COLORS.primary} />
              <Text style={styles.moodLabel}>How you're feeling</Text>
              <Text style={styles.moodValue}>
                {beforeMood.charAt(0).toUpperCase() + beforeMood.slice(1)}
              </Text>
            </View>
          )}

          {/* Breathing exercises */}
          <Text style={styles.sectionTitle}>🌬️ Breathing Exercises</Text>
          {breathingPatterns.map((pattern) => (
            <TouchableOpacity
              key={pattern.id}
              onPress={() => {
                setSelectedPattern(pattern.pattern);
                setMaxCycles(pattern.cycles);
                setScreen('breathing');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.exerciseCard, { borderLeftColor: pattern.color }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>{pattern.emoji}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{pattern.name}</Text>
                    <View style={styles.cardLevelBadge}>
                      <Text style={styles.cardLevel}>{pattern.level}</Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
                </View>
                <Text style={styles.cardDescription}>{pattern.description}</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={pattern.color} />
                    <Text style={[styles.metaText, { color: COLORS.textLight }]}>
                      ~{pattern.duration}s
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="repeat" size={16} color={pattern.color} />
                    <Text style={[styles.metaText, { color: COLORS.textLight }]}>
                      {pattern.cycles} cycles
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Grounding exercise */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            🌍 Grounding Techniques
          </Text>
          <TouchableOpacity
            onPress={() => setScreen('grounding')}
            activeOpacity={0.8}
          >
            <View style={[styles.exerciseCard, { borderLeftColor: COLORS.pink }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>🌍</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>5-4-3-2-1 Grounding</Text>
                  <View style={[styles.cardLevelBadge, { backgroundColor: `${COLORS.pink}15` }]}>
                    <Text style={[styles.cardLevel, { color: COLORS.pink }]}>Sensory Focus</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
              </View>
              <Text style={styles.cardDescription}>Reconnect with your senses</Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="eye" size={16} color={COLORS.pink} />
                  <Text style={[styles.metaText, { color: COLORS.textLight }]}>5 senses</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="infinity" size={16} color={COLORS.pink} />
                  <Text style={[styles.metaText, { color: COLORS.textLight }]}>Self-paced</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Info section */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              These exercises are designed to reduce stress and anxiety. Choose whichever feels right for you.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render Breathing Screen
  if (screen === 'breathing') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <Animated.View style={[{ flex: 1, opacity: fadeAnim }]}>
          <View style={styles.breathingHeader}>
            <TouchableOpacity 
              onPress={handleBackToMenu}
              style={styles.backButton}
            >
              <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.breathingTitle}>Breathing Exercise</Text>
            <View style={{ width: 40 }} />
          </View>

          <BreathingCircle
            pattern={selectedPattern}
            isActive={isBreathing}
            cycleCount={cycleCount}
            maxCycles={maxCycles}
            onPhaseChange={() => {
              if (cycleCount + 1 >= maxCycles) {
                handleCycleComplete();
              }
            }}
          />

          <View style={styles.breathingControls}>
            <TouchableOpacity
              style={[
                styles.breathingButton,
                { backgroundColor: isBreathing ? COLORS.danger : COLORS.primary }
              ]}
              onPress={handleBreathingToggle}
            >
              <Text style={styles.breathingButtonText}>
                {isBreathing ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mood selector after exercise */}
          {cycleCount >= maxCycles && !isBreathing && (
            <View style={styles.moodSelector}>
              <Text style={styles.moodQuestion}>How do you feel now?</Text>
              <View style={styles.moodOptions}>
                {['better', 'same', 'worse'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      setAfterMood(option);
                      setTimeout(() => handleBackToMenu(), 500);
                    }}
                    style={[
                      styles.moodOption,
                      {
                        borderColor: afterMood === option ? COLORS.primary : COLORS.border,
                        borderWidth: afterMood === option ? 2 : 1,
                        backgroundColor: afterMood === option ? `${COLORS.primary}10` : COLORS.card,
                      }
                    ]}
                  >
                    <Text style={styles.moodOptionText}>
                      {option === 'better' ? '😊' : option === 'same' ? '😐' : '😢'}
                    </Text>
                    <Text style={styles.moodOptionLabel}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Render Grounding Screen
  if (screen === 'grounding') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <Animated.View style={{ marginTop: 10, flex: 1, opacity: fadeAnim }}>
          <GroundingSteps onComplete={handleGroundingComplete} isDark={false} />
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Render Complete Screen
  if (screen === 'complete') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <Animated.View
          style={[styles.completeContainer, { opacity: fadeAnim }]}
        >
          <View style={styles.completeContent}>
            <Text style={styles.completeEmoji}>🎉</Text>
            <Text style={styles.completeTitle}>Great Job!</Text>
            <Text style={styles.completeText}>
              You completed your exercise session.
            </Text>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Session Summary</Text>
              <Text style={styles.statValue}>
                {cycleCount > 0 ? `${cycleCount} cycles completed` : 'Exercise completed'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleBackToMenu}
            >
              <Text style={styles.completeButtonText}>Back to Menu</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }
};

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
  },
  moodCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  moodLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 8,
    flex: 1,
  },
  moodValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 8,
  },
  cardEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardLevelBadge: {
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  cardLevel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  breathingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  breathingControls: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  breathingButton: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    minWidth: 140,
    alignItems: 'center',
  },
  breathingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moodSelector: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  moodQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  moodOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  moodOptionText: {
    fontSize: 28,
  },
  moodOptionLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  completeContent: {
    alignItems: 'center',
  },
  completeEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  completeText: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 30,
    textAlign: 'center',
  },
  statBox: {
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 20,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExerciseScreen;