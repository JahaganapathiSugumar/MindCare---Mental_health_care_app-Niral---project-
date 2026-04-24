import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  canSendNotificationToday,
  getRecentMoods,
  getUserBehaviorProfile,
  recordNotificationSent,
  setUserPushToken,
} from './firebase';
import i18n from '../i18n';

const SYSTEM_KEY_PREFIX = 'mindcare';
const INIT_THROTTLE_MS = 1000 * 60 * 60 * 4;
const DAILY_CHECKIN_KEY = `${SYSTEM_KEY_PREFIX}_daily_checkin`;

let notificationHandlerConfigured = false;

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)];

const getTranslator = (language) => {
  if (!language || language === i18n.language) {
    return i18n.t.bind(i18n);
  }

  return (key, options) => i18n.t(key, { lng: language, ...options });
};

const getNotificationPhrases = (language) => {
  const t = getTranslator(language);
  return {
    moodTone: {
      happy: t('notifications.moodTone.happy'),
      sad: t('notifications.moodTone.sad'),
      anxious: t('notifications.moodTone.anxious'),
      neutral: t('notifications.moodTone.neutral'),
    },
    dailyMessages: t('notifications.dailyMessages', { returnObjects: true, defaultValue: [] }),
    inactivityMessages: t('notifications.inactivityMessages', { returnObjects: true, defaultValue: [] }),
    missedMoodMessages: t('notifications.missedMoodMessages', { returnObjects: true, defaultValue: [] }),
    positiveMessages: t('notifications.positiveMessages', { returnObjects: true, defaultValue: [] }),
  };
};

const withName = (userName, text) => {
  const firstName = (userName || '').trim().split(' ')[0];
  if (!firstName) {
    return text;
  }
  return `${firstName}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
};

const getAdaptiveMessage = ({ userName = '', type = 'daily', recentMood = '', language = 'en' } = {}) => {
  const t = getTranslator(language);
  const phrases = getNotificationPhrases(language);
  const moodTone = phrases.moodTone[(recentMood || '').toLowerCase()] || phrases.moodTone.neutral;
  const dailyMessages = Array.isArray(phrases.dailyMessages) ? phrases.dailyMessages : [];
  const inactivityMessages = Array.isArray(phrases.inactivityMessages) ? phrases.inactivityMessages : [];
  const missedMoodMessages = Array.isArray(phrases.missedMoodMessages) ? phrases.missedMoodMessages : [];
  const positiveMessages = Array.isArray(phrases.positiveMessages) ? phrases.positiveMessages : [];

  if (type === 'inactivity') {
    const base = randomFrom(inactivityMessages);
    const append = t('notifications.recentMoodAppend', { tone: moodTone });
    return withName(userName, `${base} ${append}`);
  }

  if (type === 'missed') {
    return withName(userName, randomFrom(missedMoodMessages));
  }

  if (type === 'positive') {
    return withName(userName, randomFrom(positiveMessages));
  }

  return withName(userName, randomFrom(dailyMessages));
};

const getProjectId = () => {
  return Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || undefined;
};

const requestPermissions = async () => {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  if (requested.granted) {
    return true;
  }

  return false;
};

const cancelBySystemKey = async (systemKey) => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matching = scheduled.filter((item) => item?.content?.data?.systemKey === systemKey);

  await Promise.all(
    matching.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
};

export const cancelMindCareScheduledNotifications = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const managed = scheduled.filter((item) => {
    const systemKey = item?.content?.data?.systemKey || '';
    return typeof systemKey === 'string' && systemKey.startsWith(SYSTEM_KEY_PREFIX);
  });

  await Promise.all(
    managed.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
};

const isMoodUpdatedToday = (lastMoodUpdate) => {
  if (!lastMoodUpdate) {
    return false;
  }

  const date = new Date(lastMoodUpdate);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

const getHoursSince = (value) => {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
};

const scheduleSingleNotification = async ({
  userId,
  title,
  body,
  trigger,
  type,
  systemKey,
}) => {
  if (!(await canSendNotificationToday(userId, 2))) {
    return null;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: {
        userId,
        type,
        systemKey,
      },
    },
    trigger,
  });

  await recordNotificationSent(userId, type);
  return identifier;
};

export const configureNotificationHandler = () => {
  if (notificationHandlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  notificationHandlerConfigured = true;
};

export const setupNotificationPermissionsAndToken = async (userId) => {
  if (!userId) {
    return null;
  }

  configureNotificationHandler();

  if (!Device.isDevice) {
    console.log('[Notifications] Physical device required for push token retrieval.');
    return null;
  }

  const granted = await requestPermissions();
  if (!granted) {
    console.warn('[Notifications] Notification permissions denied.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2A7FBF',
    });
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId: getProjectId(),
  });

  const token = tokenResponse?.data || '';
  if (token) {
    await setUserPushToken(userId, token);
  }

  return token;
};

export const scheduleDailyMoodCheckIn = async ({
  userId,
  userName = '',
  preferredHour = 9,
  language = 'en',
}) => {
  if (!userId) {
    return;
  }

  await cancelBySystemKey(DAILY_CHECKIN_KEY);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: getTranslator(language)('notifications.dailyCheckinTitle'),
      body: getAdaptiveMessage({ userName, type: 'daily', language }),
      sound: true,
      data: {
        userId,
        type: 'daily_checkin',
        systemKey: DAILY_CHECKIN_KEY,
      },
    },
    trigger: {
      hour: Math.max(8, Math.min(22, preferredHour)),
      minute: 0,
      repeats: true,
    },
  });
};

const scheduleInactivityReminder = async ({ userId, userName, recentMood, language = 'en' }) => {
  const systemKey = `${SYSTEM_KEY_PREFIX}_inactivity_${new Date().toISOString().slice(0, 10)}`;

  await scheduleSingleNotification({
    userId,
    title: getTranslator(language)('notifications.inactivityTitle'),
    body: getAdaptiveMessage({ userName, type: 'inactivity', recentMood, language }),
    trigger: { seconds: 300 },
    type: 'inactivity',
    systemKey,
  });
};

const scheduleMissedMoodReminder = async ({ userId, userName, recentMood, language = 'en' }) => {
  const systemKey = `${SYSTEM_KEY_PREFIX}_missed_mood_${new Date().toISOString().slice(0, 10)}`;

  await scheduleSingleNotification({
    userId,
    title: getTranslator(language)('notifications.missedMoodTitle'),
    body: getAdaptiveMessage({ userName, type: 'missed', recentMood, language }),
    trigger: { seconds: 120 },
    type: 'missed_mood',
    systemKey,
  });
};

const schedulePositiveReinforcement = async ({ userId, userName, recentMood, streak = 0, language = 'en' }) => {
  if (streak < 3) {
    return;
  }

  const systemKey = `${SYSTEM_KEY_PREFIX}_streak_${new Date().toISOString().slice(0, 10)}`;
  const t = getTranslator(language);
  const body = `${getAdaptiveMessage({ userName, type: 'positive', recentMood, language })} ${t('notifications.streakSuffix', { count: streak })}`;

  await scheduleSingleNotification({
    userId,
    title: t('notifications.consistencyTitle'),
    body,
    trigger: { seconds: 180 },
    type: 'positive_reinforcement',
    systemKey,
  });
};

export const evaluateProactiveNotifications = async ({
  userId,
  userName = '',
  recentMood = '',
  language = 'en',
} = {}) => {
  if (!userId) {
    return;
  }

  const profile = await getUserBehaviorProfile(userId);
  if (!profile || !profile.notificationsEnabled) {
    return;
  }

  const hoursSinceActive = getHoursSince(profile.lastActive || profile.lastChatAt);
  const noMoodToday = !isMoodUpdatedToday(profile.lastMoodUpdate);
  const nowHour = new Date().getHours();

  if (hoursSinceActive >= 24) {
    await scheduleInactivityReminder({ userId, userName, recentMood, language });
  }

  if (noMoodToday && nowHour >= 20) {
    await scheduleMissedMoodReminder({ userId, userName, recentMood, language });
  }

  await schedulePositiveReinforcement({
    userId,
    userName,
    recentMood,
    streak: profile.currentMoodStreak || 0,
    language,
  });
};

export const initializeProactiveNotifications = async ({
  userId,
  userName = '',
  language = '',
  force = false,
} = {}) => {
  if (!userId) {
    return;
  }

  const throttleKey = `${SYSTEM_KEY_PREFIX}_last_init_${userId}`;
  const lastInitAtRaw = await AsyncStorage.getItem(throttleKey);
  const lastInitAt = Number(lastInitAtRaw || 0);

  if (!force && Date.now() - lastInitAt < INIT_THROTTLE_MS) {
    return;
  }

  await setupNotificationPermissionsAndToken(userId);

  const profile = await getUserBehaviorProfile(userId);
  if (!profile || !profile.notificationsEnabled) {
    await AsyncStorage.setItem(throttleKey, String(Date.now()));
    return;
  }

  const resolvedLanguage = language || profile.preferredLanguage || i18n.language || 'en';

  const moods = await getRecentMoods(userId, 1);
  const recentMood = moods[0]?.mood || '';

  await scheduleDailyMoodCheckIn({
    userId,
    userName,
    preferredHour: profile.preferredNotificationHour || 9,
    language: resolvedLanguage,
  });

  await evaluateProactiveNotifications({ userId, userName, recentMood, language: resolvedLanguage });
  await AsyncStorage.setItem(throttleKey, String(Date.now()));
};
