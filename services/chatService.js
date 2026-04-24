import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { getFirebaseInstance, ensureAuthInitialized } from '../firebase';
import { updateUserActivity } from './firebase';

const MOOD_LABELS = ['happy', 'sad', 'neutral', 'anxious'];

const normalizeMood = (value) => {
  const mood = (value || '').toLowerCase().trim();
  if (MOOD_LABELS.includes(mood)) {
    return mood;
  }
  return '';
};

const includesAny = (text, keywords) => keywords.some((word) => text.includes(word));

const inferMoodFromText = (message = '', response = '') => {
  const content = `${message} ${response}`.toLowerCase();

  if (!content.trim()) {
    return 'neutral';
  }

  const anxiousKeywords = [
    'anxious', 'anxiety', 'panic', 'panicking', 'worried', 'worry', 'nervous', 'stress', 'stressed',
    'fear', 'afraid', 'overthinking', 'tense', 'restless',
  ];

  const sadKeywords = [
    'sad', 'depressed', 'depression', 'hopeless', 'worthless', 'cry', 'crying', 'lonely',
    'tired', 'exhausted', 'failed', 'failure', 'suicide', 'kill myself', 'end my life', 'die',
    'hurt myself', 'self harm', 'self-harm', 'helpless',
  ];

  const happyKeywords = [
    'happy', 'good', 'great', 'joy', 'grateful', 'excited', 'proud', 'relaxed', 'calm',
    'better', 'improving', 'hopeful', 'motivated',
  ];

  if (includesAny(content, sadKeywords)) {
    return 'sad';
  }

  if (includesAny(content, anxiousKeywords)) {
    return 'anxious';
  }

  if (includesAny(content, happyKeywords)) {
    return 'happy';
  }

  return 'neutral';
};

const resolveMood = (detectedMood, message, response) => {
  const normalized = normalizeMood(detectedMood);
  const inferred = inferMoodFromText(message, response);

  if (!normalized) {
    return inferred;
  }

  if (normalized !== 'neutral') {
    return normalized;
  }

  return inferred === 'neutral' ? 'neutral' : inferred;
};

// Save chat message to Firestore
export const saveChatMessage = async (message, response, detectedMood = 'neutral', suggestions = []) => {
  const auth = await ensureAuthInitialized();
  const { db } = getFirebaseInstance();

  if (!auth?.currentUser) {
    throw new Error('No authenticated user found.');
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userId = auth.currentUser.uid;

  try {
    const chatsRef = collection(db, 'chats');
    const resolvedMood = resolveMood(detectedMood, message, response);

    const docRef = await addDoc(chatsRef, {
      userId,
      message,
      response,
      detectedMood: resolvedMood,
      suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [],
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });

    await updateUserActivity({
      userId,
      type: 'chat',
      activityAt: new Date(),
      moodUpdated: false,
    });

    console.log('[ChatService] Message saved with ID:', docRef.id);
    return {
      id: docRef.id,
      userId,
      message,
      response,
      detectedMood: resolvedMood,
      suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ChatService] Error saving chat:', error.message);
    throw error;
  }
};

export const saveAIMoodEntry = async (mood) => {
  const auth = await ensureAuthInitialized();
  const { db } = getFirebaseInstance();

  if (!auth?.currentUser) {
    throw new Error('No authenticated user found.');
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const moodsRef = collection(db, 'moods');
  const normalizedMood = normalizeMood(mood) || 'neutral';
  await addDoc(moodsRef, {
    userId: auth.currentUser.uid,
    mood: normalizedMood,
    source: 'ai',
    timestamp: serverTimestamp(),
    createdAt: new Date().toISOString(),
  });

  await updateUserActivity({
    userId: auth.currentUser.uid,
    type: 'mood',
    activityAt: new Date(),
    moodUpdated: true,
  });
};

// Fetch chat history from Firestore
export const fetchChatHistory = async (userId) => {
  const { db } = getFirebaseInstance();

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  try {
    const chatsRef = collection(db, 'chats');
    let chatsQuery;

    try {
      // Try with orderBy (preferred)
      chatsQuery = query(
        chatsRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'asc')
      );
    } catch (_error) {
      // Fallback without orderBy
      console.warn('[ChatService] OrderBy not available, using fallback');
      chatsQuery = query(chatsRef, where('userId', '==', userId));
    }

    const snap = await getDocs(chatsQuery);
    const chats = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      detectedMood: normalizeMood(doc.data().detectedMood) || 'neutral',
      suggestions: Array.isArray(doc.data().suggestions) ? doc.data().suggestions.slice(0, 3) : [],
    }));

    // Sort by timestamp if fallback was used
    return chats.sort((a, b) => {
      const aTime = a.timestamp?.toDate?.() || new Date(a.createdAt);
      const bTime = b.timestamp?.toDate?.() || new Date(b.createdAt);
      return aTime.getTime() - bTime.getTime();
    });
  } catch (error) {
    console.error('[ChatService] Error fetching chat history:', error.message);
    throw error;
  }
};

// Convert chat history to GiftedChat format
export const convertToGiftedChatFormat = (chats, userEmail = '') => {
  const messages = [];

  chats.forEach((chat) => {
    // User message
    if (chat.message) {
      messages.push({
        _id: `${chat.id}-user`,
        text: chat.message,
        createdAt: chat.timestamp?.toDate?.() || new Date(chat.createdAt),
        user: {
          _id: chat.userId,
          name: userEmail || 'You',
          avatar: null,
        },
        sent: true,
        received: true,
      });
    }

    // AI response
    if (chat.response) {
      messages.push({
        _id: `${chat.id}-ai`,
        text: chat.response,
        createdAt: chat.timestamp?.toDate?.() || new Date(chat.createdAt),
        user: {
          _id: 'ai-assistant',
          name: 'AI Assistant',
          avatar: '🤖',
        },
        sent: true,
        received: true,
      });
    }
  });

  return messages.reverse(); // GiftedChat expects newest first
};
