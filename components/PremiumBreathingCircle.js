import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withRepeat, withSequence } from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.55;

export default function PremiumBreathingCircle({
  pattern = [4, 4, 4, 4], // Array of seconds: [Inhale, Hold, Exhale, Hold(optional)]
  isActive = false,
  isPaused = false,
  onCycleComplete,
  color = '#4FC3F7' // Soft cyan/blue default
}) {
  const scaleAnim = useSharedValue(1);
  const opacityAnim = useSharedValue(0.15);
  const pulseAnim = useSharedValue(1);

  const [phaseText, setPhaseText] = useState('Ready');
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Background pulsing effect (idle state)
  useEffect(() => {
    if (!isActive) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseAnim.value = withTiming(1, { duration: 500 });
    }
  }, [isActive]);

  // Main Breathing Loop Engine
  useEffect(() => {
    let timeoutId;
    let countdownIntervalId;
    let isMounted = true;
    
    const runPhase = (idx) => {
      if (!isActive || isPaused || !isMounted) return;
      
      const duration = pattern[idx];
      setSecondsLeft(duration);
      
      let phaseName = '';
      let targetScale = 1;
      
      if (idx === 0) {
        phaseName = 'Inhale slowly...';
        targetScale = 1.6;
        Speech.speak('Inhale', { rate: 0.9, pitch: 1.1, language: 'en-US' });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (idx === 1) {
        phaseName = 'Hold...';
        targetScale = 1.6; 
        Speech.speak('Hold', { rate: 0.9, pitch: 1.1, language: 'en-US' });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (idx === 2) {
        phaseName = 'Exhale gently...';
        targetScale = 1;
        Speech.speak('Exhale', { rate: 0.9, pitch: 1.1, language: 'en-US' });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (idx === 3) {
        phaseName = 'Hold...';
        targetScale = 1;
        Speech.speak('Hold', { rate: 0.9, pitch: 1.1, language: 'en-US' });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setPhaseText(phaseName);
      
      scaleAnim.value = withTiming(targetScale, {
        duration: duration * 1000,
        easing: Easing.inOut(Easing.quad)
      });
      
      opacityAnim.value = withTiming(idx === 0 ? 0.35 : (idx === 2 ? 0.15 : opacityAnim.value), {
        duration: duration * 1000
      });

      let localSeconds = duration;
      countdownIntervalId = setInterval(() => {
        localSeconds -= 1;
        if (localSeconds >= 0 && isMounted) {
          setSecondsLeft(localSeconds);
        }
      }, 1000);

      timeoutId = setTimeout(() => {
        clearInterval(countdownIntervalId);
        
        if (!isMounted) return;

        let nextIdx = idx + 1;
        if (nextIdx >= pattern.length) {
          if (onCycleComplete) onCycleComplete();
          nextIdx = 0; // Loop back to Inhale
        }
        runPhase(nextIdx);
      }, duration * 1000);
    };

    if (isActive && !isPaused) {
       runPhase(0);
    } else if (!isActive) {
       setPhaseText('Ready');
       setSecondsLeft(0);
       scaleAnim.value = withTiming(1, { duration: 800 });
       opacityAnim.value = withTiming(0.15, { duration: 800 });
       Speech.stop();
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearInterval(countdownIntervalId);
    };
  }, [isActive, isPaused, pattern]); 

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: isActive ? scaleAnim.value : pulseAnim.value }],
      backgroundColor: color,
      opacity: opacityAnim.value,
    };
  });

  return (
    <View style={styles.container}>
      {/* Outer Glow Ring */}
      <View style={[styles.glowRing, { borderColor: color, opacity: 0.3 }]} />
      
      {/* Dynamic Animated Circle */}
      <Animated.View style={[styles.circle, animatedStyle]} />
      
      {/* Core Static Core (Optional for depth) */}
      <View style={[styles.coreCircle, { backgroundColor: color, opacity: 0.8 }]} />

      {/* Center Text */}
      <View style={styles.textContainer}>
        <Text style={styles.phaseText}>{phaseText}</Text>
        {(isActive && !isPaused && secondsLeft > 0) && (
          <Text style={styles.timerText}>{secondsLeft}s</Text>
        )}
        {isPaused && (
          <Text style={styles.timerText}>Paused</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  coreCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE * 0.8,
    height: CIRCLE_SIZE * 0.8,
    borderRadius: (CIRCLE_SIZE * 0.8) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glowRing: {
    position: 'absolute',
    width: CIRCLE_SIZE * 1.8,
    height: CIRCLE_SIZE * 1.8,
    borderRadius: (CIRCLE_SIZE * 1.8) / 2,
    borderWidth: 1,
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  phaseText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
});
