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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import BreathingCircle from '../components/BreathingCircle';
import GroundingSteps from '../components/GroundingSteps';
import { saveExerciseActivity } from '../services/activityService';
import { ensureAuthInitialized, getAuth_ } from '../firebase';

const { width } = Dimensions.get('window');

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
      color: '#4A90E2',
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
      color: '#6BCB77',
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ marginTop: 40 }} />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Wellness Exercises
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Current mood indicator */}
          {beforeMood && (
            <View style={[styles.moodCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.moodLabel, { color: theme.mutedText }]}>
                How you're feeling
              </Text>
              <Text style={[styles.moodValue, { color: theme.primary }]}>
                {beforeMood.charAt(0).toUpperCase() + beforeMood.slice(1)}
              </Text>
            </View>
          )}

          {/* Breathing exercises */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Breathing Exercises
          </Text>
          {breathingPatterns.map((pattern) => (
            <TouchableOpacity
              key={pattern.id}
              onPress={() => {
                setSelectedPattern(pattern.pattern);
                setMaxCycles(pattern.cycles);
                setScreen('breathing');
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0f0f0f'] : ['#ffffff', '#f5f9fc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.exerciseCard,
                  {
                    borderColor: pattern.color,
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>{pattern.emoji}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {pattern.name}
                    </Text>
                    <Text style={[styles.cardLevel, { color: theme.mutedText }]}>
                      {pattern.level}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardDescription, { color: theme.mutedText }]}>
                  {pattern.description}
                </Text>
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="timer" size={16} color={pattern.color} />
                    <Text style={[styles.metaText, { color: theme.text }]}>
                      ~{pattern.duration}s
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="repeat" size={16} color={pattern.color} />
                    <Text style={[styles.metaText, { color: theme.text }]}>
                      {pattern.cycles} cycles
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}

          {/* Grounding exercise */}
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>
            Grounding Techniques
          </Text>
          <TouchableOpacity
            onPress={() => setScreen('grounding')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={isDark ? ['#1a1a1a', '#0f0f0f'] : ['#ffffff', '#f5f9fc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.exerciseCard,
                {
                  borderColor: '#FF6B9D',
                  backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>🌍</Text>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    5-4-3-2-1 Grounding
                  </Text>
                  <Text style={[styles.cardLevel, { color: theme.mutedText }]}>
                    Sensory Focus
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardDescription, { color: theme.mutedText }]}>
                Reconnect with your senses
              </Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="eye" size={16} color="#FF6B9D" />
                  <Text style={[styles.metaText, { color: theme.text }]}>
                    5 senses
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="infinite" size={16} color="#FF6B9D" />
                  <Text style={[styles.metaText, { color: theme.text }]}>
                    Self-paced
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Info section */}
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: theme.primary,
                opacity: 0.1,
              },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={theme.primary}
              style={{ marginRight: 10 }}
            />
            <Text style={[styles.infoText, { color: theme.text }]}>
              These exercises are designed to reduce stress and anxiety. Choose
              whichever feels right for you.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render Breathing Screen
  if (screen === 'breathing') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Animated.View style={[{ flex: 1, opacity: fadeAnim }]}>
          <View style={styles.breathingHeader}>
            <TouchableOpacity onPress={handleBackToMenu}>
              <Ionicons name="chevron-back" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.breathingTitle, { color: theme.text, marginTop: 40 }]}>
              Breathing Exercise
            </Text>
            <View style={{ width: 28 }} />
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
            <CustomButton
              title={isBreathing ? 'Stop' : 'Start'}
              onPress={handleBreathingToggle}
              variant={isBreathing ? 'secondary' : 'primary'}
              style={{ minWidth: 120 }}
            />
          </View>

          {/* Mood selector after exercise */}
          {cycleCount >= maxCycles && !isBreathing && (
            <View style={styles.moodSelector}>
              <Text style={[styles.moodQuestion, { color: theme.text }]}>
                How do you feel now?
              </Text>
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
                        borderColor:
                          afterMood === option ? theme.primary : theme.border,
                        borderWidth: afterMood === option ? 2 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.moodOptionText, { color: theme.text }]}>
                      {option === 'better' ? '👍' : option === 'same' ? '➡️' : '👎'}
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Animated.View style={{ marginTop: 40, flex: 1, opacity: fadeAnim } }>
          <GroundingSteps onComplete={handleGroundingComplete} isDark={isDark} />
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Render Complete Screen
  if (screen === 'complete') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Animated.View
          style={[styles.completeContainer, { opacity: fadeAnim }]}
        >
          <View style={styles.completeContent}>
            <Text style={styles.completeEmoji}>🎉</Text>
            <Text style={[styles.completeTitle, { color: theme.text }]}>
              Great Job!
            </Text>
            <Text style={[styles.completeText, { color: theme.mutedText }]}>
              You completed your exercise session.
            </Text>

            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: theme.primary,
                  opacity: 0.1,
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: theme.mutedText }]}>
                Session Summary
              </Text>
              <Text style={[styles.statValue, { color: theme.primary }]}>
                {cycleCount > 0 ? `${cycleCount} cycles completed` : 'Exercise completed'}
              </Text>
            </View>

            <CustomButton
              title="Back to Menu"
              onPress={handleBackToMenu}
              style={{ marginTop: 20 }}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  moodCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  moodValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  exerciseCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '500',
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
    fontWeight: '600',
  },
  infoBox: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 40,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  breathingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  breathingTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  breathingControls: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  moodSelector: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  moodQuestion: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  moodOption: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  moodOptionText: {
    fontSize: 28,
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
    marginBottom: 10,
  },
  completeText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 30,
    textAlign: 'center',
  },
  statBox: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ExerciseScreen;
