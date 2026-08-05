import { getFirebaseInstance, getAuth_ } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, increment, serverTimestamp, runTransaction } from 'firebase/firestore';

// Define XP rewards
export const XP_REWARDS = {
  DAILY_LOGIN: 10,
  MOOD_CHECK: 15,
  AI_CHAT: 20,
  VOICE_CHAT: 25,
  JOURNAL_ENTRY: 20,
  GUIDED_BREATHING: 25,
  MEDITATION: 30,
  LEARNING_ARTICLE: 15,
  MENTAL_HEALTH_VIDEO: 20,
  COMPLETE_CBT: 40,
  GENERATE_REPORT: 15,
  DAILY_CHALLENGE: 40,
  SEVEN_DAY_STREAK: 75,
  THIRTY_DAY_STREAK: 300,
  COMPLETE_PROFILE: 30,
  BOOK_THERAPIST: 50,
  WEEKLY_GOAL: 100,
  MONTHLY_GOAL: 300,
};

// Achievements definition
export const ACHIEVEMENTS = {
  first_login: {
    id: 'first_login',
    title: 'First Login',
    description: 'Log in to the app for the first time',
    category: 'Consistency',
    maxProgress: 1,
  },
  first_ai_chat: {
    id: 'first_ai_chat',
    title: 'First AI Chat',
    description: 'Have your first conversation with Nova',
    category: 'AI',
    maxProgress: 1,
  },
  first_journal: {
    id: 'first_journal',
    title: 'First Journal',
    description: 'Write your first journal entry',
    category: 'Journal',
    maxProgress: 1,
  },
  consistency_7_day: {
    id: 'consistency_7_day',
    title: 'Consistency is Key',
    description: 'Achieve a 7-day streak',
    category: 'Consistency',
    maxProgress: 7,
  },
  consistency_30_day: {
    id: 'consistency_30_day',
    title: 'Wellness Warrior',
    description: 'Achieve a 30-day streak',
    category: 'Consistency',
    maxProgress: 30,
  },
  chat_master: {
    id: 'chat_master',
    title: 'Chatterbox',
    description: 'Complete 100 AI chats',
    category: 'AI',
    maxProgress: 100,
  },
  mood_tracker: {
    id: 'mood_tracker',
    title: 'Mood Tracker',
    description: 'Log 10 moods',
    category: 'Mood Tracking',
    maxProgress: 10,
  },
  mood_master: {
    id: 'mood_master',
    title: 'Mood Master',
    description: 'Log 50 moods',
    category: 'Mood Tracking',
    maxProgress: 50,
  },
  journal_master: {
    id: 'journal_master',
    title: 'Journal Master',
    description: 'Write 20 journal entries',
    category: 'Journal',
    maxProgress: 20,
  },
  learning_starter: {
    id: 'learning_starter',
    title: 'Learning Starter',
    description: 'Complete 5 learning activities',
    category: 'Learning',
    maxProgress: 5,
  },
  learning_master: {
    id: 'learning_master',
    title: 'Learning Master',
    description: 'Complete 25 learning activities',
    category: 'Learning',
    maxProgress: 25,
  },
};

// Calculate level based on total XP
export const calculateLevelAndProgress = (totalXP) => {
  let level = 1;
  let xpForCurrentLevel = 0;
  let xpNeededForNextLevel = 100;

  while (totalXP >= xpForCurrentLevel + xpNeededForNextLevel) {
    xpForCurrentLevel += xpNeededForNextLevel;
    level++;
    xpNeededForNextLevel = level * 100; // Next level requires more XP
  }

  const currentLevelXP = totalXP - xpForCurrentLevel;
  const progress = currentLevelXP / xpNeededForNextLevel;

  return {
    level,
    totalXP,
    currentLevelXP,
    xpNeededForNextLevel,
    progress,
  };
};



/**
 * Award XP to the current user
 * @param {string} action - Key from XP_REWARDS
 * @param {boolean} checkDuplicateDaily - If true, ensures XP is only awarded once per day for this action
 */
export const awardXP = async (action, checkDuplicateDaily = true) => {
  try {
    const auth = getAuth_();
    if (!auth || !auth.currentUser) return null;

    const { db } = getFirebaseInstance();
    const userId = auth.currentUser.uid;
    const userRef = doc(db, 'users', userId);
    
    const xpAmount = XP_REWARDS[action] || 0;
    if (xpAmount === 0) return null;

    const today = new Date().toISOString().split('T')[0];

    const result = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error('User document does not exist');
      
      const data = userDoc.data();
      const currentXP = data.totalXP || 0;
      const dailyActions = data.dailyActions || {};
      
      if (checkDuplicateDaily) {
        if (dailyActions[action] === today) {
          return { awarded: false, message: 'Already awarded today' };
        }
      }

      const newXP = currentXP + xpAmount;
      const { level: newLevel } = calculateLevelAndProgress(newXP);
      
      const updates = {
        totalXP: newXP,
        level: newLevel,
        'dailyActions.lastUpdated': today,
      };

      if (checkDuplicateDaily) {
        updates[`dailyActions.${action}`] = today;
      }

      // Add to weekly and monthly XP for leaderboards
      const currentWeek = getWeekKey(new Date());
      const currentMonth = getMonthKey(new Date());
      updates[`weeklyXP.${currentWeek}`] = (data.weeklyXP?.[currentWeek] || 0) + xpAmount;
      updates[`monthlyXP.${currentMonth}`] = (data.monthlyXP?.[currentMonth] || 0) + xpAmount;

      transaction.update(userRef, updates);
      
      // Update heatmap data
      const heatmapRef = doc(db, `users/${userId}/activity/heatmap`);
      const heatmapDoc = await transaction.get(heatmapRef);
      if (heatmapDoc.exists()) {
        const heatmapData = heatmapDoc.data();
        const count = heatmapData[today] ? heatmapData[today].count + 1 : 1;
        transaction.update(heatmapRef, { [today]: { count, date: today } });
      } else {
        transaction.set(heatmapRef, { [today]: { count: 1, date: today } });
      }
      
      // Keep track of recent activity feed
      const activityRef = doc(db, `users/${userId}/activityFeed/${Date.now()}`);
      transaction.set(activityRef, {
        action,
        xpAmount,
        timestamp: serverTimestamp(),
        date: today
      });

      return { awarded: true, xp: xpAmount, newLevel: newLevel > (data.level || 1), level: newLevel };
    });

    return result;
  } catch (error) {
    console.warn('Error awarding XP:', error);
    return null;
  }
};

/**
 * Update achievement progress
 * @param {string} achievementId - ID from ACHIEVEMENTS
 * @param {number} incrementBy - Amount to increment
 */
export const updateAchievementProgress = async (achievementId, incrementBy = 1) => {
  try {
    const auth = getAuth_();
    if (!auth || !auth.currentUser) return;

    const { db } = getFirebaseInstance();
    const userId = auth.currentUser.uid;
    const userRef = doc(db, 'users', userId);
    
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) return;
      
      const data = userDoc.data();
      const achievements = data.achievements || {};
      const currentProgress = achievements[achievementId]?.progress || 0;
      const definition = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);
      
      if (!definition) return;
      if (currentProgress >= definition.maxProgress) return; // Already completed
      
      const newProgress = Math.min(currentProgress + incrementBy, definition.maxProgress);
      const isCompleted = newProgress === definition.maxProgress;
      const completedAt = isCompleted ? serverTimestamp() : null;

      transaction.update(userRef, {
        [`achievements.${achievementId}`]: {
          progress: newProgress,
          completedAt: completedAt || achievements[achievementId]?.completedAt || null,
          isCompleted
        }
      });
      
      // Keep track of recent activity if completed
      if (isCompleted && !achievements[achievementId]?.isCompleted) {
         const activityRef = doc(db, `users/${userId}/activityFeed/${Date.now()}`);
         transaction.set(activityRef, {
           action: 'ACHIEVEMENT_UNLOCKED',
           achievementId,
           timestamp: serverTimestamp(),
         });
      }
    });
  } catch (error) {
    console.warn('Error updating achievement:', error);
  }
};

// Helper functions for week/month keys
export const getWeekKey = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
};

export const getMonthKey = (date) => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

// Function to update achievement progress
export const updateAchievement = async (userId, achievementId, incrementValue = 1) => {
  try {
    const { db } = getFirebaseInstance();
    
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return;
    
    const userData = userSnap.data();
    const achievements = userData.achievements || {};
    const achievement = achievements[achievementId] || { progress: 0, isCompleted: false };
    
    const maxProgress = ACHIEVEMENTS[achievementId]?.maxProgress || 1;
    const newProgress = Math.min(achievement.progress + incrementValue, maxProgress);
    const isCompleted = newProgress >= maxProgress;
    
    await updateDoc(userRef, {
      [`achievements.${achievementId}`]: {
        progress: newProgress,
        isCompleted: isCompleted,
        lastUpdated: new Date().toISOString(),
      }
    });
    
    return { progress: newProgress, isCompleted };
  } catch (error) {
    console.error('Error updating achievement:', error);
    return null;
  }
};

// Function to initialize achievements for new user
export const initializeAchievements = async (userId) => {
  try {
    const { db } = getFirebaseInstance();
    
    const userRef = doc(db, 'users', userId);
    const initialAchievements = {};
    
    Object.keys(ACHIEVEMENTS).forEach(key => {
      initialAchievements[key] = {
        progress: 0,
        isCompleted: false,
        lastUpdated: null,
      };
    });
    
    await updateDoc(userRef, {
      achievements: initialAchievements,
    });
    
    return true;
  } catch (error) {
    console.error('Error initializing achievements:', error);
    return false;
  }
};
