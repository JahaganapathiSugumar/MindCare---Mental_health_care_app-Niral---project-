import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { setHasSeenOnboarding } from '../utils/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ navigation, route }) => {
  const userNameFromRoute = route?.params?.userName || 'Friend';
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (saving) return;
    
    setSaving(true);
    try {
      await setHasSeenOnboarding(true);
      
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const db = getFirestore();
        await setDoc(doc(db, 'users', user.uid), { hasSeenOnboarding: true }, { merge: true });
      }
      navigation.replace('Personalization');
    } catch (error) {
      console.error('Error saving onboarding state:', error);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F7F9FC', '#E8F1FF', '#D8EAFB']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.content}>
        <View style={styles.illustrationContainer}>
          <Animated.View entering={FadeIn.duration(1000).delay(200)} style={styles.iconCircle}>
            <MaterialCommunityIcons name="heart-pulse" size={64} color="#4A90E2" />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.duration(800).delay(400)} style={styles.textContainer}>
          <Text style={styles.welcomeText}>Welcome to MindCare, {userNameFromRoute}</Text>
          <Text style={styles.descriptionText}>
            We'll personalize your experience to better support your emotional wellness journey.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800).delay(600)} style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            disabled={saving}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C3A5C',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  descriptionText: {
    fontSize: 16,
    color: '#6E859A',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    width: '100%',
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default OnboardingScreen;
