import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInRight, 
  FadeOutLeft, 
  FadeInDown,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const OptionCard = ({ option, isSelected, onPress, index }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.02 : 1, { damping: 15, stiffness: 200 });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      borderColor: withTiming(isSelected ? '#4A90E2' : 'transparent', { duration: 300 }),
      backgroundColor: withTiming(isSelected ? '#F0F8FF' : '#FFFFFF', { duration: 300 }),
    };
  });

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
      <AnimatedTouchableOpacity
        style={[styles.optionCard, animatedStyle]}
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
          <MaterialCommunityIcons
            name={option.icon}
            size={24}
            color={isSelected ? '#4A90E2' : '#8DA0B3'}
          />
        </View>
        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
          {option.defaultLabel}
        </Text>
        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
          {isSelected && <MaterialCommunityIcons name="check" size={16} color="#FFF" />}
        </View>
      </AnimatedTouchableOpacity>
    </Animated.View>
  );
};

const PersonalizationScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({
    role: null,
    concern: null,
    supportStyle: null,
  });

  const TOTAL_STEPS = 3;
  const progressWidth = useSharedValue(width * 0.33);

  useEffect(() => {
    progressWidth.value = withSpring((width - 48) * (step / TOTAL_STEPS), { damping: 15, stiffness: 100 });
  }, [step]);

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: progressWidth.value,
    };
  });

  const questions = [
    {
      step: 1,
      titleKey: 'personalization.roleTitle',
      defaultTitle: 'What best describes you?',
      key: 'role',
      options: [
        { value: 'student', defaultLabel: 'Student', icon: 'school-outline' },
        { value: 'professional', defaultLabel: 'Working Professional', icon: 'briefcase-outline' },
        { value: 'homemaker', defaultLabel: 'Homemaker', icon: 'home-outline' },
      ],
    },
    {
      step: 2,
      titleKey: 'personalization.concernTitle',
      defaultTitle: 'What are you mainly dealing with?',
      key: 'concern',
      options: [
        { value: 'stress', defaultLabel: 'Stress', icon: 'lightning-bolt-outline' },
        { value: 'anxiety', defaultLabel: 'Anxiety', icon: 'heart-pulse' },
        { value: 'overthinking', defaultLabel: 'Overthinking', icon: 'brain' },
        { value: 'lowMood', defaultLabel: 'Low Mood', icon: 'emoticon-sad-outline' },
      ],
    },
    {
      step: 3,
      titleKey: 'personalization.styleTitle',
      defaultTitle: 'How would you like support?',
      key: 'supportStyle',
      options: [
        { value: 'calm', defaultLabel: 'Calm & Supportive', icon: 'leaf' },
        { value: 'motivational', defaultLabel: 'Motivational', icon: 'rocket-launch-outline' },
        { value: 'practical', defaultLabel: 'Practical Advice', icon: 'lightbulb-outline' },
      ],
    },
  ];

  const currentQuestion = questions.find((q) => q.step === step);
  const selectedAnswer = answers[currentQuestion?.key];

  const handleSelectOption = (value) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.key]: value,
    }));
  };

  const handleNext = async () => {
    if (!selectedAnswer) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      const userProfile = {
        role: answers.role,
        concern: answers.concern,
        supportStyle: answers.supportStyle,
        personalizationCompleted: true,
        personalizationCompletedAt: new Date().toISOString(),
      };

      const db = getFirestore();
      await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });

      await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
      await AsyncStorage.setItem('personalizationCompleted', 'true');
      
      navigation.replace('TrustedContact');
    } catch (error) {
      console.error('Error saving personalization data:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(step - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F7F9FC', '#E8F1FF']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1C3A5C" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, progressStyle]} />
          </View>
        </View>
        <Text style={styles.stepText}>{step} of {TOTAL_STEPS}</Text>
      </View>

      <View style={styles.content}>
        {/* Animated Question Content */}
        <Animated.View
          key={`step-${step}`} // Forces unmount/remount for animation
          entering={FadeInRight.duration(400)}
          exiting={FadeOutLeft.duration(300)}
          style={styles.questionContainer}
        >
          <Text style={styles.title}>{t(currentQuestion.titleKey, { defaultValue: currentQuestion.defaultTitle })}</Text>
          
          <View style={styles.optionsList}>
            {currentQuestion.options.map((option, index) => (
              <OptionCard
                key={option.value}
                option={option}
                index={index}
                isSelected={selectedAnswer === option.value}
                onPress={() => handleSelectOption(option.value)}
              />
            ))}
          </View>
        </Animated.View>

        {/* Footer Controls */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextButton, !selectedAnswer && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!selectedAnswer || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.nextButtonText}>
                {step === TOTAL_STEPS ? 'Complete Setup' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#D1E3F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6E859A',
    width: 40,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  questionContainer: {
    flex: 1,
    paddingTop: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C3A5C',
    marginBottom: 30,
    letterSpacing: -0.5,
  },
  optionsList: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F7F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: '#FFFFFF',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  optionLabelSelected: {
    color: '#1C3A5C',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7D2DE',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  radioCircleSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  footer: {
    paddingBottom: 30,
    paddingTop: 10,
  },
  nextButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  nextButtonDisabled: {
    backgroundColor: '#C7D2DE',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default PersonalizationScreen;
