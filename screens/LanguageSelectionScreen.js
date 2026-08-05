import React, { useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  FadeInDown,
  FadeIn
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TopBackButton from '../components/ui/Premium/TopBackButton';

const { width } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const LanguageCard = ({ item, isSelected, onPress, index }) => {
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
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <AnimatedTouchableOpacity
        style={[styles.languageCard, animatedStyle]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.languageTextContainer}>
          <Text style={[styles.nativeName, isSelected && { color: '#2C5AA0' }]}>{item.nativeName}</Text>
          <Text style={styles.englishName}>{item.englishName}</Text>
        </View>
        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
          {isSelected && <MaterialCommunityIcons name="check" size={16} color="#FFF" />}
        </View>
      </AnimatedTouchableOpacity>
    </Animated.View>
  );
};

const LanguageSelectionScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages, languageMeta } = useLanguage();
  // Don't default to existing language to force a selection for onboarding
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [saving, setSaving] = useState(false);

  const languageItems = useMemo(() => {
    return supportedLanguages.map((code) => ({
      code,
      nativeName: languageMeta?.[code]?.nativeName || code,
      englishName: languageMeta?.[code]?.englishName || code,
    }));
  }, [languageMeta, supportedLanguages]);

  const handleContinue = async () => {
    if (saving || !selectedLanguage) {
      return;
    }

    try {
      setSaving(true);
      await setLanguage(selectedLanguage);
      navigation.replace('TermsConditions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <TopBackButton fallbackRoute="Home" />
      <LinearGradient
        colors={['#F7F9FC', '#E8F1FF']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
          <MaterialCommunityIcons name="translate" size={32} color="#4A90E2" style={styles.icon} />
          <Text style={styles.title}>Choose your language</Text>
          <Text style={styles.subtitle}>You can always change this later in settings</Text>
        </Animated.View>

        <View style={styles.languageList}>
          {languageItems.map((item, index) => (
            <LanguageCard
              key={item.code}
              item={item}
              index={index}
              isSelected={item.code === selectedLanguage}
              onPress={() => setSelectedLanguage(item.code)}
            />
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.footer}>
          <TouchableOpacity 
            style={[styles.continueButton, !selectedLanguage && styles.continueButtonDisabled]} 
            onPress={handleContinue} 
            disabled={saving || !selectedLanguage}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C3A5C',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#6E859A',
    textAlign: 'center',
    lineHeight: 22,
  },
  languageList: {
    gap: 16,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
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
  languageTextContainer: {
    flex: 1,
  },
  nativeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C3A5C',
    marginBottom: 4,
  },
  englishName: {
    fontSize: 13,
    color: '#8DA0B3',
    fontWeight: '500',
  },
  radioCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    marginTop: 'auto',
  },
  continueButton: {
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
  continueButtonDisabled: {
    backgroundColor: '#C7D2DE',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default LanguageSelectionScreen;
