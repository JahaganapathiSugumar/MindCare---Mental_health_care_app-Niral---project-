import { getFirebaseInstance } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

/**
 * Fetches the user's simulated Wellness Streak dashboard data.
 * In production, this would heavily aggregate across 'chats', 'moods', 'activities', and 'journals' collections.
 */
export const getWellnessStreakData = async (userId) => {
  if (!userId) return null;

  try {
    const { db } = getFirebaseInstance();
    
    // Simulate API fetch network delay for the UI loaders
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulated week data (Mon-Sun)
    const weekData = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Today is roughly day index 4 (Friday) for this simulation
    const todayIndex = 4;

    for (let i = 0; i < 7; i++) {
      let status = 'missed';
      let color = 'rgba(255,255,255,0.1)';

      if (i < todayIndex) {
        // Past days
        status = Math.random() > 0.2 ? 'completed' : 'partial';
      } else if (i === todayIndex) {
        // Today
        status = 'partial'; 
      } else {
        // Future days
        status = 'future';
      }

      if (status === 'completed') color = '#60A5FA'; // Blue
      if (status === 'partial') color = '#69F0AE'; // Mint Green (gentler than yellow/red)
      
      weekData.push({
        day: days[i],
        status: status,
        color: color,
        isToday: i === todayIndex
      });
    }

    return {
      currentStreak: 4,
      longestStreak: 12,
      weeklyScore: 85,
      todayProgress: {
        chat: true,
        mood: true,
        breathing: true,
        meditation: false,
        journal: false,
        report: false
      },
      weekData: weekData,
      achievements: [
        { id: 1, title: 'Calm Starter', icon: 'leaf', unlocked: true, color: '#4FC3F7' },
        { id: 2, title: '7-Day Wellness', icon: 'calendar-check', unlocked: false, color: '#B388FF' },
        { id: 3, title: 'Mood Explorer', icon: 'emoticon-happy-outline', unlocked: true, color: '#69F0AE' },
        { id: 4, title: 'Breathing Expert', icon: 'weather-windy', unlocked: true, color: '#FFD54F' },
        { id: 5, title: 'MindCare Companion', icon: 'robot-outline', unlocked: false, color: '#FF8A80' },
      ],
      aiInsight: "Your mood has improved compared to last week, and you've been consistent with AI check-ins! Welcome back. Every new day is another opportunity to care for yourself.",
      dailyQuote: "Progress is built one small step at a time."
    };

  } catch (e) {
    console.error("Failed to fetch streak data:", e);
    return null;
  }
};
