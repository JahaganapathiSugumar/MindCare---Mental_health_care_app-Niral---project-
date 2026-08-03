import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';

const TOUR_STEPS = [
  {
    title: "Welcome",
    lines: ["I'm Nova.", "Your personal AI wellness companion."],
    novaState: "greeting"
  },
  {
    title: "Quick Chat",
    lines: ["We can talk anytime.", "I'm here to listen."],
    novaState: "listening"
  },
  {
    title: "Mood Insights",
    lines: ["I'll help you understand your emotions.", "Log your feelings daily."],
    novaState: "mood"
  },
  {
    title: "Daily Reports",
    lines: ["I summarize your emotional journey.", "See how you grow."],
    novaState: "report"
  },
  {
    title: "Safety Circle",
    lines: ["If you ever need immediate help...", "I'll help you reach trusted contacts."],
    novaState: "concern"
  },
  {
    title: "Let's Begin",
    lines: ["Let's begin your wellness journey."],
    novaState: "celebration",
    isLast: true
  }
];

export default function NovaTourModal({ onStateChange, onStepChange, onVisibleChange }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const speakLines = (lines) => {
    Speech.stop();
    const textToSpeak = lines.join(' ');
    Speech.speak(textToSpeak, {
      pitch: 1.1,
      rate: 0.95,
      language: 'en-US'
    });
  };

  useEffect(() => {
    checkTourStatus();
  }, []);

  const checkTourStatus = async () => {
    try {
      const hasSeen = await AsyncStorage.getItem('hasSeenNovaTour');
      
      if (hasSeen !== 'true') {
        setIsVisible(true);
        onVisibleChange && onVisibleChange(true);
        onStepChange && onStepChange(0);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
        onStateChange && onStateChange(TOUR_STEPS[0].novaState);
        speakLines(TOUR_STEPS[0].lines);
      }
    } catch (error) {
      console.error('Error checking Nova tour status', error);
    }
  };

  const handleNext = async () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onStepChange && onStepChange(nextStep);
      onStateChange && onStateChange(TOUR_STEPS[nextStep].novaState);
      speakLines(TOUR_STEPS[nextStep].lines);
    } else {
      // Complete Tour
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        setIsVisible(false);
        Speech.stop();
        onVisibleChange && onVisibleChange(false);
        onStepChange && onStepChange(null);
        await AsyncStorage.setItem('hasSeenNovaTour', 'true');
        onStateChange && onStateChange('idle');
      });
    }
  };

  if (!isVisible) return null;

  const stepData = TOUR_STEPS[currentStep];

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 200 }]} pointerEvents="box-none">
      <View style={styles.overlay} pointerEvents="box-none">
        {/* We keep the top open so Nova Companion is visible behind the modal */}
        <View style={{ flex: 1 }} /> 
        
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)']}
            style={styles.cardGradient}
          >
            <Text style={styles.stepIndicator}>STEP {currentStep + 1} OF {TOUR_STEPS.length}</Text>
            <Text style={styles.title}>{stepData.title}</Text>
            
            <View style={styles.linesContainer}>
              {stepData.lines.map((line, index) => (
                <Text key={index} style={styles.lineText}>{line}</Text>
              ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <LinearGradient
                colors={['#4FC3F7', '#7C4DFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {stepData.isLast ? "Get Started" : "Next"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Pagination Dots */}
            <View style={styles.dotsContainer}>
              {TOUR_STEPS.map((_, idx) => (
                <View 
                  key={idx} 
                  style={[styles.dot, currentStep === idx && styles.dotActive]} 
                />
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.2)',
  },
  cardGradient: {
    padding: 30,
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#4FC3F7',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  linesContainer: {
    alignItems: 'center',
    marginBottom: 30,
    minHeight: 60, // Keep height stable
  },
  lineText: {
    fontSize: 16,
    color: '#E8F4FD',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 4,
    fontWeight: '400',
  },
  button: {
    width: '100%',
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 20,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: '#4FC3F7',
    width: 12,
  }
});
