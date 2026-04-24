import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import { getFirebaseInstance } from '../firebase';

const VALID_MOODS = ['happy', 'sad', 'neutral', 'anxious'];

const normalizeMood = (value) => {
  const mood = (value || '').toLowerCase().trim();
  return VALID_MOODS.includes(mood) ? mood : '';
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

  const hasAnxiousSignal = includesAny(content, anxiousKeywords);
  const hasSadSignal = includesAny(content, sadKeywords);
  const hasHappySignal = includesAny(content, happyKeywords);

  if (hasSadSignal) {
    return 'sad';
  }

  if (hasAnxiousSignal) {
    return 'anxious';
  }

  if (hasHappySignal) {
    return 'happy';
  }

  return 'neutral';
};

const resolveChatMood = (detectedMood, message, response) => {
  const normalized = normalizeMood(detectedMood);
  const inferred = inferMoodFromText(message, response);

  if (!normalized) {
    return inferred;
  }

  // Keep explicit non-neutral moods. If the stored mood is neutral,
  // allow stronger text signals to provide a more useful badge.
  if (normalized !== 'neutral') {
    return normalized;
  }

  return inferred === 'neutral' ? 'neutral' : inferred;
};

const toDateFromTimestamp = (value) => {
  if (!value) return null;

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const toISODate = (value) => {
  const date = toDateFromTimestamp(value);
  return date ? date.toISOString() : null;
};

const toDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (first, second) => {
  const firstDate = toDateFromTimestamp(first);
  const secondDate = toDateFromTimestamp(second);

  if (!firstDate || !secondDate) {
    return false;
  }

  return toDateKey(firstDate) === toDateKey(secondDate);
};

export const getUserBehaviorProfile = async (userId) => {
  if (!userId) {
    return null;
  }

  const { db } = getFirebaseInstance();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    return {
      uid: userId,
      notificationsEnabled: true,
      preferredLanguage: 'en',
      preferredNotificationHour: 9,
      currentMoodStreak: 0,
      lastMoodStreakDate: null,
      lastActive: null,
      lastChatAt: null,
      lastMoodUpdate: null,
      pushToken: '',
      fullName: '',
      notificationMeta: {
        dailyCount: 0,
        lastNotifiedDate: '',
      },
    };
  }

  const data = snap.data();
  return {
    uid: userId,
    notificationsEnabled: data.notificationsEnabled !== false,
    preferredNotificationHour: Number.isInteger(data.preferredNotificationHour) ? data.preferredNotificationHour : 9,
    currentMoodStreak: Number.isInteger(data.currentMoodStreak) ? data.currentMoodStreak : 0,
    lastMoodStreakDate: toISODate(data.lastMoodStreakDate || data.lastMoodUpdate),
    lastActive: toISODate(data.lastActive),
    lastChatAt: toISODate(data.lastChatAt),
    lastMoodUpdate: toISODate(data.lastMoodUpdate),
    pushToken: data.pushToken || '',
    preferredLanguage: data.preferredLanguage || 'en',
    fullName: data.fullName || '',
    notificationMeta: {
      dailyCount: Number.isInteger(data?.notificationMeta?.dailyCount) ? data.notificationMeta.dailyCount : 0,
      lastNotifiedDate: data?.notificationMeta?.lastNotifiedDate || '',
    },
  };
};

export const setUserPushToken = async (userId, pushToken) => {
  if (!userId || !pushToken) {
    return;
  }

  const { db } = getFirebaseInstance();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      uid: userId,
      pushToken,
      pushTokenUpdatedAt: new Date().toISOString(),
      notificationsEnabled: true,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
};

export const setNotificationsEnabled = async (userId, enabled) => {
  if (!userId) {
    return;
  }

  const { db } = getFirebaseInstance();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      uid: userId,
      notificationsEnabled: !!enabled,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
};

export const setUserLanguage = async (userId, language) => {
  if (!userId || !language) {
    return;
  }

  const { db } = getFirebaseInstance();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      uid: userId,
      preferredLanguage: language,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
};

export const updateUserActivity = async ({
  userId,
  type = 'chat',
  activityAt = new Date(),
  moodUpdated = false,
} = {}) => {
  if (!userId) {
    return;
  }

  const { db } = getFirebaseInstance();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const now = activityAt instanceof Date ? activityAt : new Date(activityAt);
  const nowIso = now.toISOString();
  const currentHour = now.getHours();
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const previousData = userSnap.exists() ? userSnap.data() : {};

  const previousPreferredHour = Number.isInteger(previousData.preferredNotificationHour)
    ? previousData.preferredNotificationHour
    : 9;

  const previousActivityCount = Number.isInteger(previousData.activitySampleCount)
    ? previousData.activitySampleCount
    : 0;

  const nextActivityCount = previousActivityCount + 1;
  const weightedHourTotal = previousPreferredHour * previousActivityCount + currentHour;
  const nextPreferredHour = Math.max(8, Math.min(22, Math.round(weightedHourTotal / nextActivityCount)));

  const payload = {
    uid: userId,
    lastActive: nowIso,
    preferredNotificationHour: nextPreferredHour,
    activitySampleCount: nextActivityCount,
    updatedAt: nowIso,
  };

  if (type === 'chat') {
    payload.lastChatAt = nowIso;
  }

  if (moodUpdated || type === 'mood') {
    payload.lastMoodUpdate = nowIso;

    const previousMoodStreakDate = previousData.lastMoodStreakDate || previousData.lastMoodUpdate;
    const previousStreak = Number.isInteger(previousData.currentMoodStreak)
      ? previousData.currentMoodStreak
      : 0;

    if (!isSameDay(previousMoodStreakDate, nowIso)) {
      const previousDate = toDateFromTimestamp(previousMoodStreakDate);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      if (previousDate && isSameDay(previousDate, yesterday)) {
        payload.currentMoodStreak = previousStreak + 1;
      } else {
        payload.currentMoodStreak = 1;
      }

      payload.lastMoodStreakDate = nowIso;
    }
  }

  await setDoc(userRef, payload, { merge: true });
};

export const canSendNotificationToday = async (userId, maxPerDay = 2) => {
  if (!userId) {
    return false;
  }

  const profile = await getUserBehaviorProfile(userId);
  if (!profile || !profile.notificationsEnabled) {
    return false;
  }

  const todayKey = toDateKey(new Date());
  const dailyCount = profile.notificationMeta?.lastNotifiedDate === todayKey
    ? profile.notificationMeta.dailyCount || 0
    : 0;

  return dailyCount < maxPerDay;
};

export const recordNotificationSent = async (userId, type) => {
  if (!userId) {
    return;
  }

  const { db } = getFirebaseInstance();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userRef = doc(db, 'users', userId);
  const profile = await getUserBehaviorProfile(userId);
  const todayKey = toDateKey(new Date());
  const isTodayRecord = profile?.notificationMeta?.lastNotifiedDate === todayKey;
  const nextDailyCount = isTodayRecord
    ? (profile?.notificationMeta?.dailyCount || 0) + 1
    : 1;

  await setDoc(
    userRef,
    {
      uid: userId,
      notificationMeta: {
        dailyCount: nextDailyCount,
        lastNotifiedDate: todayKey,
        lastNotificationType: type || 'general',
        lastNotificationAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
};

export const getRecentChats = async (userId, maxItems = 3) => {
  if (!userId) {
    return [];
  }

  const { db } = getFirebaseInstance();

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const chatsRef = collection(db, 'chats');

  let snap;
  try {
    const chatsQuery = query(
      chatsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(maxItems)
    );
    snap = await getDocs(chatsQuery);
  } catch (_error) {
    const fallbackQuery = query(chatsRef, where('userId', '==', userId), limit(20));
    snap = await getDocs(fallbackQuery);
  }

  const chats = snap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const createdAt =
        toDateFromTimestamp(data.timestamp) ||
        toDateFromTimestamp(data.createdAt) ||
        toDateFromTimestamp(data.updatedAt);

      return {
        id: docSnap.id,
        userId: data.userId || userId,
        message: data.message || '',
        response: data.response || '',
        detectedMood: resolveChatMood(data.detectedMood, data.message || '', data.response || ''),
        createdAt,
      };
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, maxItems);

  return chats;
};

export const getRecentMoods = async (userId, maxItems = 3) => {
  if (!userId) {
    return [];
  }

  const { db } = getFirebaseInstance();

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const moodsRef = collection(db, 'moods');

  let snap;
  try {
    const moodsQuery = query(
      moodsRef,
      where('userId', '==', userId),
      where('source', '==', 'ai'),
      orderBy('timestamp', 'desc'),
      limit(maxItems)
    );
    snap = await getDocs(moodsQuery);
  } catch (_error) {
    const fallbackQuery = query(moodsRef, where('userId', '==', userId), limit(20));
    snap = await getDocs(fallbackQuery);
  }

  const moods = snap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const createdAt =
        toDateFromTimestamp(data.timestamp) ||
        toDateFromTimestamp(data.createdAt) ||
        toDateFromTimestamp(data.updatedAt);

      return {
        id: docSnap.id,
        userId: data.userId || userId,
        mood: (data.mood || '').toLowerCase(),
        note: data.note || '',
        source: data.source || 'manual',
        createdAt,
      };
    })
    .filter((item) => item.source === 'ai')
    .sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, maxItems);

  return moods;
};

export const getMoodHistoryWindow = async (userId, days = 14, maxItems = 50) => {
  if (!userId) {
    return [];
  }

  const { db } = getFirebaseInstance();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const moodsRef = collection(db, 'moods');
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - days);

  let snap;
  try {
    const moodsQuery = query(
      moodsRef,
      where('userId', '==', userId),
      where('source', '==', 'ai'),
      orderBy('timestamp', 'desc'),
      limit(maxItems)
    );
    snap = await getDocs(moodsQuery);
  } catch (_error) {
    const fallbackQuery = query(moodsRef, where('userId', '==', userId), limit(maxItems * 2));
    snap = await getDocs(fallbackQuery);
  }

  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const createdAt =
        toDateFromTimestamp(data.timestamp) ||
        toDateFromTimestamp(data.createdAt) ||
        toDateFromTimestamp(data.updatedAt);

      return {
        id: docSnap.id,
        mood: (data.mood || '').toLowerCase(),
        source: data.source || 'manual',
        createdAt,
      };
    })
    .filter((item) => item.source === 'ai' && item.createdAt && item.createdAt.getTime() >= thresholdDate.getTime())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, maxItems);
};

export const getChatHistoryWindow = async (userId, days = 14, maxItems = 80) => {
  if (!userId) {
    return [];
  }

  const { db } = getFirebaseInstance();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const chatsRef = collection(db, 'chats');
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - days);

  let snap;
  try {
    const chatsQuery = query(
      chatsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(maxItems)
    );
    snap = await getDocs(chatsQuery);
  } catch (_error) {
    const fallbackQuery = query(chatsRef, where('userId', '==', userId), limit(maxItems * 2));
    snap = await getDocs(fallbackQuery);
  }

  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const createdAt =
        toDateFromTimestamp(data.timestamp) ||
        toDateFromTimestamp(data.createdAt) ||
        toDateFromTimestamp(data.updatedAt);

      return {
        id: docSnap.id,
        message: data.message || '',
        response: data.response || '',
        detectedMood: resolveChatMood(data.detectedMood, data.message || '', data.response || ''),
        createdAt,
      };
    })
    .filter((item) => item.createdAt && item.createdAt.getTime() >= thresholdDate.getTime())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, maxItems);
};
