import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getFirebaseInstance } from '../firebase';

/**
 * Save exercise activity to Firestore
 * Tracks breathing and grounding exercises with mood data
 */
export const saveExerciseActivity = async (userId, exerciseData) => {
  try {
    if (!userId) {
      console.warn('[ActivityService] No userId provided');
      return null;
    }

    const { db } = getFirebaseInstance();
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const activityData = {
      userId,
      type: exerciseData.type, // 'breathing' | 'grounding'
      pattern: exerciseData.pattern, // '4-4-6', '4-7-8', 'grounding'
      duration: exerciseData.duration, // in seconds
      beforeMood: exerciseData.beforeMood || null,
      afterMood: exerciseData.afterMood || null,
      cyclesCompleted: exerciseData.cyclesCompleted || 1,
      completed: exerciseData.completed || true,
      notes: exerciseData.notes || '',
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'activities'), activityData);
    
    console.log('[ActivityService] Exercise saved:', docRef.id);
    return {
      id: docRef.id,
      ...activityData,
    };
  } catch (error) {
    console.error('[ActivityService] Error saving exercise:', error.message);
    return null;
  }
};

/**
 * Get today's exercise activities
 */
export const getTodayActivities = async (userId) => {
  try {
    if (!userId) {
      console.warn('[ActivityService] No userId provided');
      return [];
    }

    const { db } = getFirebaseInstance();
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'activities'),
      where('userId', '==', userId),
      where('type', '==', 'breathing'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const snapshot = await getDocs(q);
    const activities = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = new Date(data.createdAt);
      
      if (createdAt >= today) {
        activities.push({
          id: doc.id,
          ...data,
        });
      }
    });

    console.log('[ActivityService] Got activities:', activities.length);
    return activities;
  } catch (error) {
    console.error('[ActivityService] Error fetching activities:', error.message);
    return [];
  }
};

/**
 * Calculate stress reduction insights
 * Compare mood before and after exercise
 */
export const calculateMoodImprovement = (beforeMood, afterMood) => {
  const moodScore = {
    happy: 4,
    neutral: 3,
    sad: 2,
    anxious: 1,
  };

  const before = moodScore[beforeMood?.toLowerCase()] || 0;
  const after = moodScore[afterMood?.toLowerCase()] || 0;
  const improvement = after - before;

  return {
    improved: improvement > 0,
    declined: improvement < 0,
    stable: improvement === 0,
    score: improvement,
  };
};

/**
 * Get exercise recommendations based on mood
 */
export const getExerciseRecommendation = (currentMood) => {
  const mood = (currentMood || '').toLowerCase();

  if (mood === 'anxious') {
    return {
      suggested: true,
      type: 'breathing',
      pattern: '4-4-6',
      message: 'Try a quick 1-minute breathing exercise to calm your mind',
      duration: 60,
    };
  }

  if (mood === 'sad') {
    return {
      suggested: true,
      type: 'grounding',
      message: 'A grounding exercise can help you reconnect with the present',
      duration: 120,
    };
  }

  return {
    suggested: false,
  };
};

/**
 * Get weekly exercise stats
 */
export const getWeeklyExerciseStats = async (userId) => {
  try {
    if (!userId) {
      return {
        totalExercises: 0,
        breathingCount: 0,
        groundingCount: 0,
        totalDuration: 0,
      };
    }

    const { db } = getFirebaseInstance();
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const q = query(
      collection(db, 'activities'),
      where('userId', '==', userId),
      where('completed', '==', true),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    let stats = {
      totalExercises: 0,
      breathingCount: 0,
      groundingCount: 0,
      totalDuration: 0,
    };

    snapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = new Date(data.createdAt);

      if (createdAt >= sevenDaysAgo) {
        stats.totalExercises++;
        if (data.type === 'breathing') stats.breathingCount++;
        if (data.type === 'grounding') stats.groundingCount++;
        stats.totalDuration += data.duration || 0;
      }
    });

    return stats;
  } catch (error) {
    console.error('[ActivityService] Error getting stats:', error.message);
    return {
      totalExercises: 0,
      breathingCount: 0,
      groundingCount: 0,
      totalDuration: 0,
    };
  }
};
