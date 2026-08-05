import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addXP, updateStreak, XP_REWARDS } from '../services/xpService';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ensureAuthInitialized, getAuth_ } from '../firebase';
import { sendMessageToAI } from '../services/apiService';
import { fetchChatHistory, saveAIMoodEntry, saveChatMessage, saveMoodRecoveryScore } from '../services/chatService';
import { saveMoodFromChat, extractMoodFromText } from '../services/moodExtractionService';
import { updateAchievement } from '../services/gamificationService';
import MoodRecoveryCard from '../components/MoodRecoveryCard';
import SuggestionsPanel from '../components/SuggestionsPanel';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

const MOOD_SCALE = {
  sad: 1,
  anxious: 2,
  neutral: 3,
  happy: 4,
};

const normalizeMood = (value) => {
  const mood = String(value || '').trim().toLowerCase();
  return MOOD_SCALE[mood] ? mood : 'neutral';
};

const formatMessageTime = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const toStartOfDay = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDaySeparator = (dateValue, t) => {
  const day = toStartOfDay(dateValue);
  if (!day) {
    return '';
  }

  const today = toStartOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (day.getTime() === today.getTime()) {
    return t('common.today');
  }

  if (day.getTime() === yesterday.getTime()) {
    return t('common.yesterday');
  }

  return day.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const ChatScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [highlightChatId, setHighlightChatId] = useState(route?.params?.highlightChatId || null);
  const [previewBannerChat, setPreviewBannerChat] = useState(route?.params?.previewChat || null);
  const [sessionInitialMood, setSessionInitialMood] = useState('');
  const [sessionFinalMood, setSessionFinalMood] = useState('');
  const [moodRecoveryScore, setMoodRecoveryScore] = useState(0);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const themeFadeAnim = useRef(new Animated.Value(1)).current;
  const typingDot1 = useRef(new Animated.Value(0.25)).current;
  const typingDot2 = useRef(new Animated.Value(0.25)).current;
  const typingDot3 = useRef(new Animated.Value(0.25)).current;

  const shouldAutoFocusInput = !route?.params?.highlightChatId && !route?.params?.previewChat;

  useEffect(() => {
    if (route?.params?.highlightChatId) {
      setHighlightChatId(route.params.highlightChatId);
    }

    if (route?.params?.previewChat) {
      setPreviewBannerChat(route.params.previewChat);
    }
  }, [route?.params?.highlightChatId, route?.params?.previewChat]);

  const selectedMessageIds = useMemo(() => {
    if (!highlightChatId) {
      return new Set();
    }
    return new Set([`${highlightChatId}-user`, `${highlightChatId}-ai`]);
  }, [highlightChatId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, []);

  const loadChatHistory = useCallback(async () => {
    try {
      const auth = await ensureAuthInitialized();
      if (auth?.currentUser) {
        const userId = auth.currentUser.uid;
        const email = auth.currentUser.email || t('profile.mindcareUser');

        setCurrentUser({ _id: userId });
        setUserEmail(email);

        const chatHistory = await fetchChatHistory(userId);
        const formattedMessages = [];

        chatHistory.forEach((chat) => {
          const baseTime = chat.timestamp?.toDate?.() || new Date(chat.createdAt);

          if (chat.message) {
            formattedMessages.push({
              _id: `${chat.id}-user`,
              text: chat.message,
              createdAt: baseTime,
              sender: 'user',
              senderName: email,
              chatId: chat.id,
            });
          }

          if (chat.response) {
            formattedMessages.push({
              _id: `${chat.id}-ai`,
              text: chat.response,
              createdAt: baseTime,
              sender: 'ai',
              senderName: t('chat.title'),
              chatId: chat.id,
              suggestions: Array.isArray(chat.suggestions) ? chat.suggestions : [],
            });
          }
        });

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('[ChatScreen] Load history error:', error.message);
      Alert.alert(t('auth.genericError', { defaultValue: 'Error' }), t('chat.loadHistoryError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    if (highlightChatId) {
      const targetAiId = `${highlightChatId}-ai`;
      const targetUserId = `${highlightChatId}-user`;
      const index = messages.findIndex((msg) => msg._id === targetAiId || msg._id === targetUserId);

      if (index >= 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
          });
        }, 180);
      } else {
        scrollToBottom();
      }
    } else {
      scrollToBottom();
    }
  }, [messages, highlightChatId, scrollToBottom]);

  useEffect(() => {
    if (!highlightChatId) {
      return;
    }

    const timer = setTimeout(() => {
      setHighlightChatId(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [highlightChatId]);

  useEffect(() => {
    if (!previewBannerChat) {
      return;
    }

    const timer = setTimeout(() => {
      setPreviewBannerChat(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [previewBannerChat]);

  useEffect(() => {
    if (!shouldAutoFocusInput || loading || !currentUser) {
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 180);

    return () => clearTimeout(timer);
  }, [shouldAutoFocusInput, loading, currentUser]);

  useEffect(() => {
    themeFadeAnim.setValue(0.72);
    Animated.timing(themeFadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isDark, themeFadeAnim]);

  useEffect(() => {
    if (!sending) {
      typingDot1.setValue(0.25);
      typingDot2.setValue(0.25);
      typingDot3.setValue(0.25);
      return;
    }

    const pulse = (value, delay) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.25,
          duration: 380,
          useNativeDriver: true,
        }),
      ])
    );

    const animations = [
      pulse(typingDot1, 0),
      pulse(typingDot2, 120),
      pulse(typingDot3, 240),
    ];

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [sending, typingDot1, typingDot2, typingDot3]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || sending || !currentUser) {
      return;
    }

    try {
      await Haptics.selectionAsync();
    } catch (_error) { }

    const userMessageText = inputText.trim();
    const userMessage = {
      _id: Math.random().toString(36).substring(2),
      text: userMessageText,
      createdAt: new Date(),
      sender: 'user',
      senderName: userEmail,
    };

    setInputText('');
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);

    try {
      const currentUserAuth = getAuth_()?.currentUser;
      if (currentUserAuth) {
        const extractedMood = await saveMoodFromChat(userMessageText, currentUserAuth.uid);
        console.log('[ChatScreen] Mood extracted and saved:', extractedMood);
        
        if (extractedMood) {
          DeviceEventEmitter.emit('moodUpdated', { 
            mood: extractedMood, 
            source: 'chat',
            timestamp: new Date()
          });
          console.log('[ChatScreen] Mood update event emitted for:', extractedMood);
        }
      }

      const result = await sendMessageToAI(currentUser._id, userMessageText, language);

      if (result.success) {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (_error) { }

        const aiMessage = {
          _id: Math.random().toString(36).substring(2),
          text: result.response,
          createdAt: new Date(),
          sender: 'ai',
          senderName: t('chat.title'),
          suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
          ragData: result.ragData || { usingRag: false, sources: [], relevanceScores: [], contextChunks: [] },
        };

        setMessages((prev) => [...prev, aiMessage]);

        if (result.crisis?.showEmergencyAlert) {
          Alert.alert(
            t('chat.crisisAlertTitle', { defaultValue: 'You matter. Let us keep you safe.' }),
            t('chat.crisisAlertBody', {
              defaultValue: 'If you might hurt yourself or feel in immediate danger, contact local emergency services or a trusted person right now.',
            }),
            [
              {
                text: t('common.ok', { defaultValue: 'OK' }),
                style: 'default',
              },
            ]
          );
        }

        try {
          const detectedMood = result.mood || 'neutral';
          const normalizedDetectedMood = normalizeMood(detectedMood);

          const initialMood = sessionInitialMood || normalizedDetectedMood;
          const finalMood = normalizedDetectedMood;
          const score = (MOOD_SCALE[finalMood] || 3) - (MOOD_SCALE[initialMood] || 3);

          setSessionInitialMood(initialMood);
          setSessionFinalMood(finalMood);
          setMoodRecoveryScore(score);

          if (!sessionInitialMood || sessionFinalMood !== finalMood) {
            try {
              await saveMoodRecoveryScore({
                initialMood,
                finalMood,
              });
            } catch (recoveryError) {
              console.warn('[ChatScreen] Failed to save mood recovery score:', recoveryError.message);
            }
          }

          await saveChatMessage(
            userMessageText,
            result.response,
            detectedMood,
            Array.isArray(result.suggestions) ? result.suggestions : []
          );
          await saveAIMoodEntry(detectedMood);
          
          // Gamification and XP updates
          if (currentUserAuth) {
            await updateAchievement(currentUserAuth.uid, 'first_ai_chat');
            await updateAchievement(currentUserAuth.uid, 'chat_master');
            
            // Add XP for AI chat
            const xpResult = await addXP(currentUserAuth.uid, XP_REWARDS.AI_CHAT, 'chat');
            console.log('XP added:', xpResult);
            
            // Update streak
            const streakResult = await updateStreak(currentUserAuth.uid);
            console.log('Streak updated:', streakResult);
            
            // If level up, show notification
            if (xpResult.leveledUp) {
              Alert.alert(
                t('gamification.levelUpTitle', { defaultValue: '🎉 Level Up!' }),
                t('gamification.levelUpMessage', { level: xpResult.newLevel, defaultValue: `You've reached Level ${xpResult.newLevel}! Keep going!` }),
                [{ text: t('common.awesome', { defaultValue: 'Awesome!' }) }]
              );
            }
          }
        } catch (saveError) {
          console.warn('[ChatScreen] Failed to save to Firestore:', saveError.message);
        }
      } else {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (_error) { }

        const errorMessage = {
          _id: Math.random().toString(36).substring(2),
          text: result.error || t('chat.genericResponseError'),
          createdAt: new Date(),
          sender: 'ai',
          senderName: t('chat.title'),
        };

        setMessages((prev) => [...prev, errorMessage]);
        Alert.alert(t('chat.aiErrorTitle'), result.error || t('api.failed'));
      }
    } catch (error) {
      console.error('[ChatScreen] Send error:', error.message || error);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (_error) { }
      Alert.alert(t('auth.genericError', { defaultValue: 'Error' }), t('chat.sendError'));
    } finally {
      setSending(false);
    }
  }, [inputText, sending, currentUser, userEmail, language, t, sessionInitialMood, sessionFinalMood]);

  const renderMessage = ({ item }) => {
    const isUserMessage = item.sender === 'user';
    const isHighlighted = selectedMessageIds.has(item._id);

    const handleSuggestionPress = async (suggestion) => {
      setInputText(suggestion);
      try {
        await Haptics.selectionAsync();
      } catch (_error) { }

      setTimeout(() => {
        inputRef.current?.focus();
      }, 90);
    };

    return (
      <View style={[styles.messageRow, isUserMessage ? styles.messageRowUser : styles.messageRowAi]}>
        {!isUserMessage ? (
          <View style={styles.aiAvatarWrap}>
            <MaterialCommunityIcons name="robot-happy-outline" size={16} color="#2A7FBF" />
          </View>
        ) : null}

        <View
          style={[
            styles.messageBubble,
            isUserMessage
              ? [styles.userBubble, { backgroundColor: theme.primary, borderColor: theme.primary }]
              : [styles.aiBubble, { backgroundColor: theme.card, borderColor: theme.border }],
            isHighlighted ? styles.highlightedBubble : null,
          ]}
        >
          <Text style={[styles.messageText, isUserMessage ? styles.userText : [styles.aiText, { color: theme.text }]]}>{item.text}</Text>

          {isUserMessage && item.text && (
            <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="emoticon-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>
                {t('chat.moodPrefix', { defaultValue: 'Mood:' })} {extractMoodFromText(item.text)}
              </Text>
            </View>
          )}

          {!isUserMessage && item.ragData?.usingRag ? (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="book-open-variant" size={14} color="#2A7FBF" />
                <Text style={{ fontSize: 12, color: '#2A7FBF', marginLeft: 4, fontWeight: '500' }}>
                  {t('chat.knowledgeBase', { defaultValue: 'Knowledge Base' })}
                </Text>
              </View>
              {item.ragData?.sources?.length > 0 && (
                <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 4 }}>
                  {t('chat.basedOnSources', { count: item.ragData.sources.length, defaultValue: `Based on ${item.ragData.sources.length} source${item.ragData.sources.length > 1 ? 's' : ''}` })}
                </Text>
              )}
            </View>
          ) : null}

          <Text style={[styles.timestamp, isUserMessage ? styles.userTimestamp : [styles.aiTimestamp, { color: theme.mutedText }]]}>
            {formatMessageTime(item.createdAt)}
          </Text>

          {!isUserMessage && Array.isArray(item.suggestions) && item.suggestions.length ? (
            <SuggestionsPanel suggestions={item.suggestions} onSuggestionPress={handleSuggestionPress} />
          ) : null}
        </View>
      </View>
    );
  };

  const renderMessageWithDaySeparator = ({ item, index }) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const currentDay = toStartOfDay(item.createdAt);
    const previousDay = previousMessage ? toStartOfDay(previousMessage.createdAt) : null;
    const showSeparator = !previousDay || !currentDay || previousDay.getTime() !== currentDay.getTime();

    return (
      <>
        {showSeparator ? (
          <View style={styles.daySeparatorWrap}>
            <View style={styles.daySeparatorLine} />
            <Text style={styles.daySeparatorText}>{formatDaySeparator(item.createdAt, t)}</Text>
            <View style={styles.daySeparatorLine} />
          </View>
        ) : null}
        {renderMessage({ item })}
      </>
    );
  };

  if (loading || !currentUser) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.mutedText }]}>{t('chat.loadingConversation')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <Animated.View style={{ flex: 1, opacity: themeFadeAnim }}>
          <View style={[styles.headerCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Pressable
              onPress={async () => {
                try {
                  await Haptics.selectionAsync();
                } catch (_error) { }
                navigation.goBack();
              }}
              style={[styles.backButton, { backgroundColor: isDark ? '#252B33' : '#EEF6FC' }]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>{t('chat.title')}</Text>
              <Text style={[styles.headerSubtitle, { color: theme.mutedText }]}>{t('chat.subtitle')}</Text>
            </View>

            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{t('chat.online')}</Text>
            </View>
          </View>

          {previewBannerChat ? (
            <View style={[styles.previewBanner, { backgroundColor: isDark ? '#26303A' : '#DDEEFE' }]}>
              <MaterialCommunityIcons name="history" size={16} color="#346EA1" />
              <Text style={[styles.previewBannerText, { color: isDark ? '#BFD5EA' : '#2A5F89' }]} numberOfLines={1}>
                {t('chat.openedFromRecent', { message: previewBannerChat.message || t('chat.previewFallback') })}
              </Text>
            </View>
          ) : null}

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageWithDaySeparator}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => scrollToBottom()}
          />

          {sending ? (
            <View style={[styles.typingContainer, { backgroundColor: isDark ? '#222A31' : '#EAF4FF', borderColor: theme.border }]}>
              <MaterialCommunityIcons name="robot-happy-outline" size={14} color="#2A7FBF" />
              <Text style={[styles.typingText, { color: theme.primary }]}>{t('chat.thinking', { defaultValue: 'AI is typing...' })}</Text>
              <View style={styles.typingDotsWrap}>
                <Animated.View style={[styles.typingDot, { opacity: typingDot1, backgroundColor: theme.primary }]} />
                <Animated.View style={[styles.typingDot, { opacity: typingDot2, backgroundColor: theme.primary }]} />
                <Animated.View style={[styles.typingDot, { opacity: typingDot3, backgroundColor: theme.primary }]} />
              </View>
            </View>
          ) : null}

          {sessionInitialMood && sessionFinalMood ? (
            <MoodRecoveryCard
              score={moodRecoveryScore}
              initialMood={sessionInitialMood}
              finalMood={sessionFinalMood}
            />
          ) : null}

          <View style={styles.inputBarWrap}>
            <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.text }]}
                placeholder={t('chat.inputPlaceholder')}
                placeholderTextColor={theme.mutedText}
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!sending}
                maxLength={500}
              />
              <TouchableOpacity
                style={{ padding: 8, marginRight: 4, alignSelf: 'flex-end', marginBottom: 2 }}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch (e) { }
                  navigation.navigate('VoiceCompanion');
                }}
              >
                <Ionicons name="mic-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, (sending || !inputText.trim()) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={sending || !inputText.trim()}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF5FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECF5FB',
  },
  loadingText: {
    marginTop: 10,
    color: '#567A97',
    fontSize: 14,
    fontWeight: '600',
  },
  headerCard: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#12263A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF6FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#153B59',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6A8AA3',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF9EF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#50C878',
  },
  statusText: {
    fontSize: 11,
    color: '#2F8D5A',
    fontWeight: '700',
  },
  previewBanner: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#DDEEFE',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewBannerText: {
    flex: 1,
    color: '#2A5F89',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  daySeparatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 5,
    paddingHorizontal: 4,
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D4E5F2',
  },
  daySeparatorText: {
    marginHorizontal: 8,
    fontSize: 11,
    color: '#86A0B5',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 5,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  aiAvatarWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DBEBF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: '#121826',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 6,
  },
  highlightedBubble: {
    borderColor: '#F2B93B',
    shadowColor: '#F2B93B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1B4668',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
  },
  userTimestamp: {
    color: '#C7E1F4',
  },
  aiTimestamp: {
    color: '#94AFC4',
  },
  typingContainer: {
    marginHorizontal: 14,
    marginBottom: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#EAF4FF',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typingText: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '700',
  },
  typingDotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 2,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  inputBarWrap: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#121826',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 110,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
  },
});

export default ChatScreen;