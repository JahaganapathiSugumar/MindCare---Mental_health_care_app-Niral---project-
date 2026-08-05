import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voice from '@dev-amirzubair/react-native-voice';
import * as Speech from 'expo-speech';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  Easing, 
  withSpring,
  interpolateColor
} from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { ensureAuthInitialized } from '../firebase';
import { sendMessageToAI } from '../services/apiService';
import { saveChatMessage, saveAIMoodEntry } from '../services/chatService';
import { useLanguage } from '../context/LanguageContext';
import TopBackButton from '../components/ui/Premium/TopBackButton';

const { width, height } = Dimensions.get('window');

const TypewriterText = ({ text, style, delay = 45 }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let isMounted = true;
    let currentIndex = 0;
    setDisplayedText('');
    
    // Add a small delay before starting to type to sync better with voice startup
    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (!isMounted) {
           clearInterval(interval);
           return;
        }
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, delay);
      return () => clearInterval(interval);
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(startTimeout);
    };
  }, [text, delay]);

  return <Text style={style}>{displayedText}</Text>;
};

const VoiceCompanionScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [currentUser, setCurrentUser] = useState(null);
  
  // States: 'idle', 'listening', 'thinking', 'speaking'
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [anxietyDetected, setAnxietyDetected] = useState(false);

  // Animation Values
  const orbScale = useSharedValue(1);
  const orbOpacity = useSharedValue(0.6);
  const glowScale = useSharedValue(1.2);
  const particleTranslateY = useSharedValue(0);

  useEffect(() => {
    const initAuth = async () => {
      const auth = await ensureAuthInitialized();
      if (auth?.currentUser) {
        setCurrentUser(auth.currentUser);
      }
    };
    initAuth();
  }, []);

  // Voice Setup
  useEffect(() => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      Speech.stop();
    };
  }, []);

  // Animation Controls
  useEffect(() => {
    if (status === 'idle') {
      orbScale.value = withSpring(1);
      orbOpacity.value = withTiming(0.6);
      glowScale.value = withTiming(1.2);
    } else if (status === 'listening') {
      orbScale.value = withRepeat(withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
      orbOpacity.value = withRepeat(withTiming(0.9, { duration: 1000 }), -1, true);
      glowScale.value = withRepeat(withTiming(1.4, { duration: 1000 }), -1, true);
    } else if (status === 'thinking') {
      orbScale.value = withRepeat(withSequence(
        withTiming(0.9, { duration: 500 }),
        withTiming(1.05, { duration: 500 })
      ), -1, true);
      orbOpacity.value = withTiming(0.4);
      glowScale.value = withTiming(1.1);
    } else if (status === 'speaking') {
      if (anxietyDetected) {
        // Breathing Mode (CBT)
        orbScale.value = withRepeat(withSequence(
          withTiming(1.8, { duration: 4000, easing: Easing.inOut(Easing.sin) }), // Inhale
          withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.sin) })  // Exhale
        ), -1, true);
        orbOpacity.value = withRepeat(withSequence(
          withTiming(1, { duration: 4000 }),
          withTiming(0.5, { duration: 4000 })
        ), -1, true);
        glowScale.value = withRepeat(withSequence(
          withTiming(2.2, { duration: 4000 }),
          withTiming(1.2, { duration: 4000 })
        ), -1, true);
      } else {
        // Normal Speaking (rapid small pulses simulating voice)
        orbScale.value = withRepeat(withSequence(
          withTiming(1.05, { duration: 150 }),
          withTiming(0.95, { duration: 150 }),
          withTiming(1.1, { duration: 200 }),
          withTiming(1.0, { duration: 150 })
        ), -1, true);
        orbOpacity.value = withTiming(0.8);
        glowScale.value = withTiming(1.3);
      }
    }
  }, [status, anxietyDetected]);

  // Floating particles background
  useEffect(() => {
    particleTranslateY.value = withRepeat(withTiming(-20, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const onSpeechStart = (e) => {
    console.log('onSpeechStart:', e);
    setStatus('listening');
    setAiResponse('');
  };

  const onSpeechRecognized = (e) => {
    console.log('onSpeechRecognized:', e);
  };

  const onSpeechEnd = (e) => {
    console.log('onSpeechEnd:', e);
    // Let stopListening handle transition to thinking
  };

  const onSpeechError = (e) => {
    console.log('onSpeechError:', e);
    setStatus('idle');
    if (e.error?.message !== '7/No match') { // Ignore "no match" errors when stopping
       Alert.alert('Microphone Error', 'Could not recognize speech. Please try again.');
    }
  };

  const onSpeechResults = (e) => {
    console.log('onSpeechResults:', e);
    if (e.value && e.value.length > 0) {
      setTranscript(e.value[0]);
    }
  };

  const onSpeechPartialResults = (e) => {
    if (e.value && e.value.length > 0) {
      setTranscript(e.value[0]);
    }
  };

  const startListening = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTranscript('');
      setAiResponse('');
      Speech.stop();
      setStatus('listening');
      await Voice.start(language || 'en-US');
    } catch (e) {
      console.error('startListening error:', e);
      setStatus('idle');
    }
  };

  const stopListeningAndSend = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.error('Voice.stop error:', e);
    }
    
    if (!transcript.trim()) {
      setStatus('idle');
      return;
    }

    setStatus('thinking');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentUser) {
      const response = await sendMessageToAI(currentUser.uid, transcript, language, true);
      
      if (response.success) {
        setAiResponse(response.response);
        
        // Detect anxiety (basic check)
        const anxiousKeywords = ['anxious', 'stress', 'panic', 'overwhelmed', "can't breathe", 'scared', 'worry'];
        const isAnxious = anxiousKeywords.some(kw => transcript.toLowerCase().includes(kw)) || response.mood === 'anxious';
        setAnxietyDetected(isAnxious);

        // Save conversation and detected mood to Firestore so it appears on the Dashboard
        try {
          await saveChatMessage(
            transcript,
            response.response,
            response.mood || 'neutral',
            response.suggestions || []
          );
          await saveAIMoodEntry(response.mood || 'neutral');
        } catch (saveError) {
          console.warn('[VoiceCompanion] Failed to save to Firestore:', saveError.message);
        }

        setStatus('speaking');
        
        // Use Expo Speech to speak the AI response
        Speech.speak(response.response, {
          language: language === 'en' ? 'en-US' : language, // Use selected language
          pitch: 1.0,
          rate: isAnxious ? 0.8 : 1.0, // Slower rate if anxious
          onDone: () => {
             setStatus('idle');
             setAnxietyDetected(false);
          },
          onError: () => setStatus('idle')
        });
      } else {
        setStatus('idle');
        Alert.alert('Error', response.error || 'Failed to get a response.');
      }
    }
  };

  const handleMicPress = () => {
    if (status === 'listening') {
      stopListeningAndSend();
    } else if (status === 'speaking' || status === 'thinking') {
      Speech.stop();
      Voice.stop();
      setStatus('idle');
    } else {
      startListening();
    }
  };

  const handleClose = () => {
    Speech.stop();
    Voice.stop().catch(() => {});
    navigation.goBack();
  };

  // Animated Styles
  const orbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: orbScale.value }],
      opacity: orbOpacity.value,
      backgroundColor: anxietyDetected ? '#64D2FF' : '#5A9CFF', // Calmer blue if anxious
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: glowScale.value }],
      opacity: orbOpacity.value * 0.5,
      backgroundColor: anxietyDetected ? '#64D2FF' : '#5A9CFF',
    };
  });

  const particleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: particleTranslateY.value }],
    };
  });

  const getStatusText = () => {
    switch (status) {
      case 'idle': return 'Tap to start talking';
      case 'listening': return "I'm listening...";
      case 'thinking': return 'Thinking...';
      case 'speaking': return anxietyDetected ? 'Breathe with me...' : 'Speaking...';
      default: return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <TopBackButton fallbackRoute="Home" />
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Particles (Decorative) */}
      <Animated.View style={[styles.particle, particleStyle, { top: height * 0.2, left: width * 0.2, width: 6, height: 6 }]} />
      <Animated.View style={[styles.particle, particleStyle, { top: height * 0.6, left: width * 0.8, width: 8, height: 8, animationDelay: '1s' }]} />
      <Animated.View style={[styles.particle, particleStyle, { top: height * 0.3, left: width * 0.7, width: 4, height: 4 }]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="chevron-down" size={32} color="#E2E8F0" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="robot-outline" size={20} color="#94A3B8" />
          <Text style={styles.headerTitle}>AI Companion</Text>
        </View>
        <View style={styles.closeButton} />
      </View>

      {/* Center AI Orb */}
      <View style={styles.orbContainer}>
        <Animated.View style={[styles.glow, glowAnimatedStyle]} />
        <Animated.View style={[styles.orb, orbAnimatedStyle]} />
      </View>

      {/* Status & Transcription */}
      <View style={styles.textWrapper}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {status === 'listening' && (
            <Text style={styles.userTranscriptText}>
              {transcript || '...'}
            </Text>
          )}

          {status === 'speaking' && (
            <TypewriterText 
              text={aiResponse} 
              style={styles.aiTranscriptText} 
              delay={anxietyDetected ? 70 : 45} 
            />
          )}
        </ScrollView>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[
            styles.micButton, 
            status === 'listening' ? styles.micButtonActive : null,
            (status === 'speaking' || status === 'thinking') ? styles.micButtonStop : null
          ]} 
          onPress={handleMicPress}
        >
          {status === 'listening' ? (
            <Ionicons name="stop" size={32} color="#0F172A" />
          ) : status === 'speaking' || status === 'thinking' ? (
            <Ionicons name="close" size={32} color="#FFFFFF" />
          ) : (
            <Ionicons name="mic" size={32} color="#0F172A" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  headerTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  orbContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    position: 'absolute',
    shadowColor: '#5A9CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  glow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    position: 'absolute',
    filter: 'blur(10px)', // Web/new React Native only, falls back gracefully
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
    borderRadius: 99,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  textWrapper: {
    flex: 0.8,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  scrollView: {
    width: '100%',
    flex: 1,
    marginTop: 10,
  },
  scrollContent: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  userTranscriptText: {
    color: '#94A3B8',
    fontSize: 22,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 34,
    fontStyle: 'italic',
  },
  aiTranscriptText: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  controlsContainer: {
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F8FAFC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: '#64D2FF',
    shadowColor: '#64D2FF',
  },
  micButtonStop: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
});

export default VoiceCompanionScreen;
