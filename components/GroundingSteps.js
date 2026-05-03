import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  TextInput,
  Keyboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import CustomButton from './CustomButton';

const { width } = Dimensions.get('window');

/**
 * 5-4-3-2-1 Grounding Exercise Component
 * 
 * Guides users through sensory grounding technique:
 * - 5 things you see
 * - 4 things you feel
 * - 3 things you hear
 * - 2 things you smell
 * - 1 thing you taste
 */
const GroundingSteps = ({ onComplete, isDark: propIsDark }) => {
  const { theme, isDark: contextIsDark } = useTheme();
  const isDark = propIsDark !== undefined ? propIsDark : contextIsDark;

  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({
    see: [],
    feel: [],
    hear: [],
    smell: [],
    taste: [],
  });
  const [currentInput, setCurrentInput] = useState('');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const steps = [
    {
      key: 'see',
      number: 5,
      sense: 'see',
      emoji: '👀',
      instruction: 'Look around. What are 5 things you can see?',
      examples: 'clouds, wall, tree, shadow, window',
      color: '#FFD93D',
    },
    {
      key: 'feel',
      number: 4,
      sense: 'feel',
      emoji: '✋',
      instruction: 'What are 4 things you can physically feel?',
      examples: 'chair, breeze, socks, phone',
      color: '#6BCB77',
    },
    {
      key: 'hear',
      number: 3,
      sense: 'hear',
      emoji: '👂',
      instruction: 'What are 3 things you can hear?',
      examples: 'traffic, birds, breathing',
      color: '#4D96FF',
    },
    {
      key: 'smell',
      number: 2,
      sense: 'smell',
      emoji: '👃',
      instruction: 'What are 2 things you can smell?',
      examples: 'coffee, trees',
      color: '#FF6B9D',
    },
    {
      key: 'taste',
      number: 1,
      sense: 'taste',
      emoji: '👅',
      instruction: 'What is 1 thing you can taste?',
      examples: 'gum, mint, water',
      color: '#C896EE',
    },
  ];

  const step = steps[currentStep];
  const itemsNeeded = step.number - responses[step.key].length;

  // Fade in animation on step change
  React.useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [currentStep, fadeAnim]);

  const handleAddItem = () => {
    if (!currentInput.trim()) return;

    setResponses((prev) => ({
      ...prev,
      [step.key]: [...prev[step.key], currentInput.trim()],
    }));
    setCurrentInput('');

    // Move to next step if all items entered
    if (itemsNeeded === 1) {
      setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          // Exercise complete
          onComplete?.({
            see: responses.see,
            feel: responses.feel,
            hear: responses.hear,
            smell: responses.smell,
            taste: responses.taste,
          });
        }
      }, 300);
    }
  };

  const handleRemoveItem = (index) => {
    setResponses((prev) => ({
      ...prev,
      [step.key]: prev[step.key].filter((_, i) => i !== index),
    }));
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.(responses);
    }
  };

  const handleGoBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#0a0a0a' : '#f5f9fc',
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Grounding Exercise
        </Text>
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>
          Step {currentStep + 1} of {steps.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: step.color,
              width: `${progress}%`,
            },
          ]}
        />
      </View>

      {/* Main content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step indicator circle */}
        <View style={styles.stepIndicator}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor: step.color,
                opacity: 0.2,
              },
            ]}
          >
            <Text style={styles.stepEmoji}>{step.emoji}</Text>
          </View>
        </View>

        {/* Instruction */}
        <Text style={[styles.instruction, { color: theme.text }]}>
          {step.instruction}
        </Text>

        {/* Examples */}
        <Text style={[styles.examples, { color: theme.mutedText }]}>
          Examples: {step.examples}
        </Text>

        {/* Remaining count */}
        <Text style={[styles.remaining, { color: step.color }]}>
          {itemsNeeded} more needed
        </Text>

        {/* Input field */}
        <View style={styles.inputSection}>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: step.color,
                color: theme.text,
                backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              },
            ]}
            placeholder={`Enter something you ${step.sense}...`}
            placeholderTextColor={theme.mutedText}
            value={currentInput}
            onChangeText={setCurrentInput}
            onSubmitEditing={handleAddItem}
            blurOnSubmit={false}
          />
          <CustomButton
            title="Add"
            onPress={handleAddItem}
            variant="primary"
            style={styles.addButton}
            disabled={!currentInput.trim()}
          />
        </View>

        {/* Items list */}
        <View style={styles.itemsList}>
          {responses[step.key].map((item, index) => (
            <View
              key={index}
              style={[
                styles.item,
                {
                  backgroundColor: step.color,
                  opacity: 0.15,
                },
              ]}
            >
              <Text style={[styles.itemText, { color: theme.text }]}>
                {item}
              </Text>
              <CustomButton
                title="Remove"
                onPress={() => handleRemoveItem(index)}
                variant="secondary"
                style={styles.removeButton}
              />
            </View>
          ))}
        </View>

        {/* Tips */}
        <View
          style={[
            styles.tipBox,
            {
              backgroundColor: step.color,
              opacity: 0.1,
            },
          ]}
        >
          <Text style={[styles.tipLabel, { color: theme.mutedText }]}>
            💡 Tip
          </Text>
          <Text style={[styles.tipText, { color: theme.text }]}>
            Take your time. There are no wrong answers. The goal is to ground
            yourself in your senses.
          </Text>
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.buttons}>
        <CustomButton
          title="Back"
          onPress={handleGoBack}
          variant="secondary"
          disabled={currentStep === 0}
          style={styles.buttonHalf}
        />
        <CustomButton
          title={currentStep === steps.length - 1 ? 'Complete' : 'Skip'}
          onPress={handleSkip}
          variant="secondary"
          style={styles.buttonHalf}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  stepIndicator: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepEmoji: {
    fontSize: 48,
  },
  instruction: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  examples: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  remaining: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    minWidth: 70,
  },
  itemsList: {
    gap: 10,
    marginBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  removeButton: {
    minWidth: 60,
  },
  tipBox: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  buttons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
    marginVertical: 0,
  },
});

export default GroundingSteps;
