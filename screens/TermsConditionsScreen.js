import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseInstance } from '../firebase';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import TopBackButton from '../components/ui/Premium/TopBackButton';

const TermsConditionsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    if (!agreed) {
      Alert.alert(
        t('terms.errorTitle', { defaultValue: 'Please Agree' }),
        t('terms.agreeMessage', { defaultValue: 'Please check the box to agree to the terms.' })
      );
      return;
    }

    setSaving(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const timestamp = new Date().toISOString();

      // Save to AsyncStorage
      await AsyncStorage.setItem('termsAccepted', 'true');
      await AsyncStorage.setItem('termsAcceptedAt', timestamp);

      // Save to Firebase
      const { auth, db } = getFirebaseInstance();
      if (auth?.currentUser?.uid && db) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(
          userRef,
          {
            termsAccepted: true,
            termsAcceptedAt: timestamp,
          },
          { merge: true }
        );
      }
      
      navigation.replace('Onboarding');
    } catch (error) {
      console.error('[Terms] Accept error:', error);
      Alert.alert(
        t('terms.errorSaving', { defaultValue: 'Error' }),
        t('terms.errorSavingMsg', { defaultValue: 'Could not save your agreement. Please try again.' })
      );
      setSaving(false);
    }
  };

  const sections = [
    {
      id: 'disclaimer',
      icon: 'alert-circle-outline',
      title: 'Mental Health Disclaimer',
      content: 'MindCare is NOT a medical service. AI responses are informational and supportive only, and are NOT a replacement for professional therapy, medical diagnosis, or emergency care. Always consult qualified healthcare professionals for medical concerns.',
    },
    {
      id: 'emergency',
      icon: 'phone-alert-outline',
      title: 'Emergency Situations',
      content: 'If you are in immediate danger or experiencing a mental health crisis, please contact local emergency services or a crisis helpline immediately. MindCare is designed for supportive guidance only and should not be relied upon during emergencies.',
    },
    {
      id: 'privacy',
      icon: 'lock-outline',
      title: 'Privacy & Data',
      content: 'Your conversations are stored securely and encrypted. Personalization data helps improve your AI experience. Emergency contact information is stored securely and used only with your explicit consent.',
    },
    {
      id: 'ai-limitations',
      icon: 'brain',
      title: 'AI Limitations',
      content: 'AI may generate incomplete, inaccurate, or contextually inappropriate responses. Do not rely solely on AI responses for important personal or medical decisions. Always verify information with trusted sources.',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
        <TopBackButton fallbackRoute="Home" />
      <LinearGradient
        colors={['#F7F9FC', '#E8F1FF']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <Text style={styles.headerSubtitle}>Please review before continuing your wellness journey</Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Content Sections */}
        {sections.map((section, index) => (
          <Animated.View
            key={section.id}
            entering={FadeInDown.delay(100 * (index + 1)).duration(500)}
            style={styles.sectionCard}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={section.icon} size={22} color="#4A90E2" />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Sticky Footer */}
      <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.footer}>
        <View style={styles.checkboxContainer}>
          <Pressable
            onPress={() => {
              setAgreed(!agreed);
              Haptics.selectionAsync();
            }}
            style={[styles.checkbox, agreed && styles.checkboxChecked]}
          >
            {agreed && <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />}
          </Pressable>
          <Text style={styles.checkboxLabel}>
            I understand and agree to the Terms & Conditions
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleAccept}
          disabled={saving || !agreed}
          activeOpacity={0.8}
          style={[styles.continueButton, (!agreed || saving) && styles.continueButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Agree & Continue</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C3A5C',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#6E859A',
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140, // Space for sticky footer
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C3A5C',
    flex: 1,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 34, // Safe area bottom
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C7D2DE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    lineHeight: 20,
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

export default TermsConditionsScreen;
