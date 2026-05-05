import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { ThemeContext } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';

const PersonalizationScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({
    role: null,
    concern: null,
    supportStyle: null,
  });

  const TOTAL_STEPS = 3;

  // Question data with i18n keys
  const questions = [
    {
      step: 1,
      titleKey: 'personalization.roleTitle',
      defaultTitle: 'What best describes you?',
      key: 'role',
      options: [
        { value: 'student', labelKey: 'personalization.student', defaultLabel: 'Student', icon: 'school' },
        { value: 'professional', labelKey: 'personalization.professional', defaultLabel: 'Working Professional', icon: 'briefcase' },
        { value: 'homemaker', labelKey: 'personalization.homemaker', defaultLabel: 'Homemaker', icon: 'home' },
      ],
    },
    {
      step: 2,
      titleKey: 'personalization.concernTitle',
      defaultTitle: 'What are you mainly dealing with?',
      key: 'concern',
      options: [
        { value: 'stress', labelKey: 'personalization.stress', defaultLabel: 'Stress', icon: 'alert-circle' },
        { value: 'anxiety', labelKey: 'personalization.anxiety', defaultLabel: 'Anxiety', icon: 'heart-pulse' },
        { value: 'overthinking', labelKey: 'personalization.overthinking', defaultLabel: 'Overthinking', icon: 'brain' },
        { value: 'lowMood', labelKey: 'personalization.lowMood', defaultLabel: 'Low Mood', icon: 'emoticon-sad' },
      ],
    },
    {
      step: 3,
      titleKey: 'personalization.styleTitle',
      defaultTitle: 'How would you like support?',
      key: 'supportStyle',
      options: [
        { value: 'calm', labelKey: 'personalization.calm', defaultLabel: 'Calm & Supportive', icon: 'leaf' },
        { value: 'motivational', labelKey: 'personalization.motivational', defaultLabel: 'Motivational', icon: 'rocket' },
        { value: 'practical', labelKey: 'personalization.practical', defaultLabel: 'Practical Advice', icon: 'lightbulb' },
      ],
    },
  ];

  const currentQuestion = questions.find((q) => q.step === step);
  const selectedAnswer = answers[currentQuestion?.key];

  const handleSelectOption = (value) => {
    setAnswers({
      ...answers,
      [currentQuestion.key]: value,
    });
  };

  const handleNext = async () => {
    if (!selectedAnswer) {
      Alert.alert(
        t('personalization.selectOption', { defaultValue: 'Please select an option' })
      );
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      // Final step - save data
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
        userId: user.uid,
        email: user.email,
        role: answers.role,
        concern: answers.concern,
        supportStyle: answers.supportStyle,
        personalizationCompleted: true,
        personalizationCompletedAt: new Date().toISOString(),
      };

      // Save to Firebase Firestore
      const db = getFirestore();
      await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });

      // Save locally to AsyncStorage
      await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
      await AsyncStorage.setItem('personalizationCompleted', 'true');

      // Navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Error saving personalization data:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          {step > 1 && (
            <TouchableOpacity onPress={handleBack} style={{ marginBottom: 12 }}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>
          )}
          <Text style={{ fontSize: 28, fontWeight: '700', color: theme.text }}>
            {t('personalization.helpPersonalize', { defaultValue: 'Help us personalize' })}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.mutedText,
              marginTop: 4,
            }}
          >
            {t('personalization.subtitle', { defaultValue: 'your experience' })}
          </Text>
        </View>

        {/* Progress Indicator */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                backgroundColor: i <= step ? '#4A90E2' : theme.border,
                borderRadius: 2,
              }}
            />
          ))}
        </View>
        <Text
          style={{
            paddingHorizontal: 24,
            fontSize: 12,
            color: theme.mutedText,
            marginBottom: 24,
          }}
        >
          {t('personalization.stepOf', { defaultValue: `Step ${step} of ${TOTAL_STEPS}`, step, total: TOTAL_STEPS })}
        </Text>

        {/* Question Content */}
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.text,
              marginBottom: 20,
            }}
          >
            {t(currentQuestion?.titleKey, { defaultValue: currentQuestion?.defaultTitle })}
          </Text>

          {/* Options */}
          <View style={{ gap: 12 }}>
            {currentQuestion?.options.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleSelectOption(option.value)}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor:
                    selectedAnswer === option.value ? '#EAF4FF' : '#FFFFFF',
                  borderWidth: 2,
                  borderColor:
                    selectedAnswer === option.value ? '#4A90E2' : theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={24}
                  color={selectedAnswer === option.value ? '#4A90E2' : theme.mutedText}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color:
                      selectedAnswer === option.value ? '#4A90E2' : theme.text,
                    flex: 1,
                  }}
                >
                  {t(option.labelKey, { defaultValue: option.defaultLabel })}
                </Text>
                {selectedAnswer === option.value && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color="#4A90E2"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Next/Continue Button */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <TouchableOpacity
            onPress={handleNext}
            disabled={!selectedAnswer || loading}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: 12,
              backgroundColor:
                selectedAnswer && !loading ? '#4A90E2' : '#E0E0E0',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}
                >
                  {step === TOTAL_STEPS
                    ? t('personalization.getStarted', { defaultValue: 'Get Started' })
                    : t('personalization.next', { defaultValue: 'Next' })}
                </Text>
                <MaterialCommunityIcons
                  name={step === TOTAL_STEPS ? 'check' : 'arrow-right'}
                  size={20}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PersonalizationScreen;
