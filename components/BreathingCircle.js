import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

/**
 * Animated Breathing Circle Component
 * 
 * Features:
 * - Smooth scale animations for inhale/exhale phases
 * - Phase text display (Inhale, Hold, Exhale)
 * - Visual progress indicator
 * - Calming colors and design
 */
const BreathingCircle = ({
  pattern = '4-4-6', // '4-4-6' | '4-7-8'
  isActive = false,
  onPhaseChange,
  cycleCount = 0,
  maxCycles = 5,
}) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const [currentPhase, setCurrentPhase] = useState('READY');
  const [phaseText, setPhaseText] = useState('Ready');
  const [phaseSubtext, setPhaseSubtext] = useState('');
  const [nextPhaseIn, setNextPhaseIn] = useState(0);

  // Parse breathing pattern
  const getPattern = () => {
    const [inhale, hold, exhale] = pattern.split('-').map(Number);
    return { inhale, hold, exhale };
  };

  // Breathing cycle logic
  useEffect(() => {
    if (!isActive) {
      // Reset animation when inactive
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: true,
      }).start();
      setCurrentPhase('READY');
      setPhaseText('Ready');
      setPhaseSubtext('');
      return;
    }

    const { inhale, hold, exhale } = getPattern();
    const totalDuration = (inhale + hold + exhale) * 1000;
    let currentTime = 0;

    // Phase 1: Inhale
    const inhaleTimer = setTimeout(() => {
      setCurrentPhase('INHALE');
      setPhaseText('Inhale');
      setPhaseSubtext(`${inhale} seconds`);
      onPhaseChange?.('INHALE');

      Animated.timing(scaleAnim, {
        toValue: 1.4,
        duration: inhale * 1000,
        useNativeDriver: true,
      }).start();
    }, 0);

    // Phase 2: Hold
    const holdTimer = setTimeout(() => {
      setCurrentPhase('HOLD');
      setPhaseText('Hold');
      setPhaseSubtext(`${hold} seconds`);
      onPhaseChange?.('HOLD');

      scaleAnim.setValue(1.4);
    }, inhale * 1000);

    // Phase 3: Exhale
    const exhaleTimer = setTimeout(() => {
      setCurrentPhase('EXHALE');
      setPhaseText('Exhale');
      setPhaseSubtext(`${exhale} seconds`);
      onPhaseChange?.('EXHALE');

      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: exhale * 1000,
        useNativeDriver: true,
      }).start();
    }, (inhale + hold) * 1000);

    return () => {
      clearTimeout(inhaleTimer);
      clearTimeout(holdTimer);
      clearTimeout(exhaleTimer);
    };
  }, [isActive, pattern, scaleAnim, onPhaseChange]);

  // Pulse animation when active
  useEffect(() => {
    if (!isActive) return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [isActive, pulseAnim]);

  const circleSize = width * 0.5;
  const progressPercentage = ((cycleCount / maxCycles) * 100).toFixed(0);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f9fc' }]}>
      {/* Background gradient effect */}
      <View style={[styles.bgGlow, { opacity: isActive ? 0.3 : 0.1 }]} />

      {/* Progress indicator */}
      <View style={styles.progressSection}>
        <Text style={[styles.progressText, { color: theme.mutedText }]}>
          Cycle {cycleCount + 1} / {maxCycles}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
                width: `${progressPercentage}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Main breathing circle */}
      <View style={styles.circleContainer}>
        {/* Outer pulse ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              opacity: pulseAnim,
              transform: [{ scale: pulseAnim }],
              borderColor: theme.primary,
            },
          ]}
        />

        {/* Main animated circle */}
        <Animated.View
          style={[
            styles.breathingCircle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              backgroundColor: theme.primary,
              opacity: 0.15,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        />

        {/* Center text */}
        <View style={styles.centerText}>
          <Text style={[styles.phaseLabel, { color: theme.primary }]}>
            {phaseText}
          </Text>
          {phaseSubtext && (
            <Text style={[styles.phaseSubtext, { color: theme.mutedText }]}>
              {phaseSubtext}
            </Text>
          )}
          {currentPhase === 'READY' && (
            <Text style={[styles.readyText, { color: theme.mutedText }]}>
              Tap Start to begin
            </Text>
          )}
        </View>
      </View>

      {/* Breathing tips */}
      {isActive && currentPhase === 'INHALE' && (
        <View style={styles.tipSection}>
          <Text style={[styles.tipText, { color: theme.text }]}>
            💡 Breathe deeply through your nose
          </Text>
        </View>
      )}
      {isActive && currentPhase === 'EXHALE' && (
        <View style={styles.tipSection}>
          <Text style={[styles.tipText, { color: theme.text }]}>
            💡 Slowly exhale through your mouth
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  bgGlow: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: '#4A90E2',
    opacity: 0.1,
  },
  progressSection: {
    position: 'absolute',
    top: 60,
    width: width - 40,
    paddingHorizontal: 20,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
  },
  pulseRing: {
    position: 'absolute',
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: (width * 0.55) / 2,
    borderWidth: 2,
  },
  breathingCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  phaseLabel: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  phaseSubtext: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  readyText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  tipSection: {
    position: 'absolute',
    bottom: 100,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tipText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BreathingCircle;
