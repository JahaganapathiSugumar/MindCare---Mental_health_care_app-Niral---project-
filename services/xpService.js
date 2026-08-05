// services/xpService.js
import { getFirebaseInstance, getAuth_ } from '../firebase';
import { doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';

// XP rewards for different activities
export const XP_REWARDS = {
  DAILY_LOGIN: 10,
  DAILY_STREAK_BONUS: 5,
  AI_CHAT: 15,
  AI_CHAT_STREAK: 25,
  MOOD_LOG: 10,
  MOOD_STREAK: 20,
  JOURNAL_ENTRY: 15,
  JOURNAL_STREAK: 25,
  COMPLETE_LESSON: 20,
  COMPLETE_QUIZ: 30,
  COMPLETE_COURSE: 50,
  ACHIEVEMENT_UNLOCK: 50,
  CONSISTENCY_7_DAY: 30,
  CONSISTENCY_30_DAY: 100,
};

export const getLevelFromXP = (xp) => {
  if (xp < 100) return 1;
  if (xp < 250) return 2;
  if (xp < 500) return 3;
  if (xp < 1000) return 4;
  if (xp < 2000) return 5;
  if (xp < 3500) return 6;
  if (xp < 5000) return 7;
  if (xp < 7500) return 8;
  if (xp < 10000) return 9;
  return 10;
};

export const getXPForNextLevel = (currentLevel) => {
  const levels = {
    1: 100,
    2: 150,
    3: 250,
    4: 500,
    5: 1000,
    6: 1500,
    7: 1500,
    8: 2500,
    9: 2500,
    10: Infinity,
  };
  return levels[currentLevel] || 500;
};

export const addXP = async (userId, amount, activityType) => {
  try {
    const { db } = getFirebaseInstance();
    const userRef = doc(db, 'users', userId);
    
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        totalXP: 0,
        level: 1,
        streak: 0,
        lastActivity: null,
      });
    }
    
    await updateDoc(userRef, {
      totalXP: increment(amount),
      lastActivity: new Date().toISOString(),
    });
    
    const updatedSnap = await getDoc(userRef);
    const data = updatedSnap.data();
    const newLevel = getLevelFromXP(data.totalXP);
    const oldLevel = data.level || 1;
    
    if (newLevel > oldLevel) {
      await updateDoc(userRef, {
        level: newLevel,
      });
      
      return {
        success: true,
        xpAdded: amount,
        newTotal: data.totalXP + amount,
        leveledUp: true,
        newLevel: newLevel,
        oldLevel: oldLevel,
      };
    }
    
    return {
      success: true,
      xpAdded: amount,
      newTotal: data.totalXP + amount,
      leveledUp: false,
    };
  } catch (error) {
    console.error('Error adding XP:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const updateStreak = async (userId) => {
  try {
    const { db } = getFirebaseInstance();
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return { streak: 0, bonus: 0 };
    
    const data = userSnap.data();
    const today = new Date().toDateString();
    const lastActivity = data.lastActivity ? new Date(data.lastActivity).toDateString() : null;
    
    let streak = data.streak || 0;
    let streakBonus = 0;
    
    if (lastActivity === today) {
      return { streak, bonus: 0 };
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastActivity === yesterdayStr) {
      streak += 1;
      streakBonus = Math.min(streak * XP_REWARDS.DAILY_STREAK_BONUS, 50);
    } else {
      streak = 1;
    }
    
    await updateDoc(userRef, {
      streak: streak,
    });
    
    return { streak, bonus: streakBonus };
  } catch (error) {
    console.error('Error updating streak:', error);
    return { streak: 0, bonus: 0 };
  }
};