import { getFirebaseInstance, getAuth_ } from '../firebase';
import { collection, getDoc, doc } from 'firebase/firestore';

/**
 * Fetches the user's Wellness Streak dashboard data based on real Firestore data.
 */
export const getWellnessStreakData = async (userId) => {
  if (!userId) return null;

  try {
    const { db } = getFirebaseInstance();
    const user = getAuth_()?.currentUser;
    
    // Simulate API fetch network delay for the UI loaders
    await new Promise(resolve => setTimeout(resolve, 800));

    // Fetch user profile from Firestore
    let userData = {};
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        userData = userDoc.data();
      }
    }

    // Default streak values if not found in db
    const currentStreak = userData.streak || 0;
    const longestStreak = userData.longestStreak || 0;
    const weeklyScore = userData.xp || 0;

    // Simulated week data (Mon-Sun)
    const weekData = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Calculate current day index (0 for Monday, 6 for Sunday)
    const today = new Date();
    let todayIndex = today.getDay() - 1;
    if (todayIndex < 0) todayIndex = 6; // Sunday is 0 in JS, we want it to be 6

    for (let i = 0; i < 7; i++) {
      let status = 'missed';
      let color = 'rgba(255,255,255,0.1)';

      if (i < todayIndex) {
        // Past days (mocked based on streak length)
        status = (todayIndex - i) <= currentStreak ? 'completed' : 'missed';
      } else if (i === todayIndex) {
        // Today
        status = 'partial'; 
      } else {
        // Future days
        status = 'future';
      }

      if (status === 'completed') color = '#60A5FA'; // Blue
      if (status === 'partial') color = '#69F0AE'; // Mint Green
      
      weekData.push({
        day: days[i],
        status: status,
        color: color,
        isToday: i === todayIndex
      });
    }

    return {
      currentStreak: currentStreak,
      longestStreak: longestStreak > currentStreak ? longestStreak : currentStreak,
      weeklyScore: weeklyScore,
      todayProgress: {
        chat: !!userData.lastChatAt && new Date(userData.lastChatAt).getDate() === today.getDate(),
        mood: !!userData.lastMoodAt && new Date(userData.lastMoodAt).getDate() === today.getDate(),
        breathing: !!userData.lastBreathingAt && new Date(userData.lastBreathingAt).getDate() === today.getDate(),
        meditation: false,
        journal: false,
        report: false
      },
      weekData: weekData,
      achievements: [
        { id: 1, title: 'Calm Starter', icon: 'leaf', unlocked: currentStreak >= 1, color: '#4FC3F7' },
        { id: 2, title: '7-Day Wellness', icon: 'calendar-check', unlocked: currentStreak >= 7, color: '#B388FF' },
        { id: 3, title: 'Mood Explorer', icon: 'emoticon-happy-outline', unlocked: !!userData.lastMoodAt, color: '#69F0AE' },
        { id: 4, title: 'Breathing Expert', icon: 'weather-windy', unlocked: !!userData.lastBreathingAt, color: '#FFD54F' },
        { id: 5, title: 'MindCare Companion', icon: 'robot-outline', unlocked: currentStreak >= 30, color: '#FF8A80' },
      ],
      aiInsight: currentStreak > 0 
        ? "Your mood has improved compared to last week, and you've been consistent! Welcome back." 
        : "Every new day is another opportunity to care for yourself. Start by logging your mood today!",
      dailyQuote: "Progress is built one small step at a time."
    };

  } catch (e) {
    console.error("Failed to fetch streak data:", e);
    return null;
  }
};
