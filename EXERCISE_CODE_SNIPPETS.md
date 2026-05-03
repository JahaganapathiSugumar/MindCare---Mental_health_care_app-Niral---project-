# Exercise Feature - Quick Integration Snippets

## Navigation Quick Start

### From Any Screen
```javascript
// Navigate to Exercise menu
navigation.navigate('Exercise');

// Navigate with pre-filled mood
navigation.navigate('Exercise', { mood: 'anxious' });
```

---

## Chat Screen Integration (Priority 1)

### Add ExerciseSuggestion When Anxious

```javascript
// In screens/ChatScreen.js

import ExerciseSuggestion from '../components/ExerciseSuggestion';
import { getExerciseRecommendation } from '../services/activityService';

export default function ChatScreen({ navigation, route }) {
  const [showExerciseSuggestion, setShowExerciseSuggestion] = useState(false);
  const [suggestedMood, setSuggestedMood] = useState(null);

  // After receiving AI response with mood inference:
  const handleMessageResponse = (aiResponse, detectedMood) => {
    // Show suggestion if anxious
    if (detectedMood === 'anxious') {
      setSuggestedMood('anxious');
      setShowExerciseSuggestion(true);
    }
  };

  return (
    <View>
      {/* Existing chat UI */}
      <GiftedChat
        // ... existing props
        onSend={(messages) => handleSend(messages)}
      />

      {/* Add suggestion card */}
      {showExerciseSuggestion && (
        <ExerciseSuggestion
          mood={suggestedMood}
          onPress={() => {
            navigation.navigate('Exercise', { mood: suggestedMood });
            setShowExerciseSuggestion(false);
          }}
          dismissed={false}
        />
      )}
    </View>
  );
}
```

---

## Home Screen Integration (Priority 2)

### Add Exercise Quick Action

```javascript
// In screens/HomeScreen.js

import { useNavigation } from '@react-navigation/native';
import ExerciseSuggestion from '../components/ExerciseSuggestion';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [recentMood, setRecentMood] = useState(null);

  return (
    <ScrollView>
      {/* Existing header and sections */}

      {/* Quick Actions - Add Wellness button */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.quickActionsRow}>
          {/* Existing buttons */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Chat')}
            style={styles.actionButton}
          >
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={styles.actionLabel}>Talk to AI</Text>
          </TouchableOpacity>

          {/* NEW: Exercise button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Exercise')}
            style={styles.actionButton}
          >
            <Text style={styles.actionEmoji}>🧘</Text>
            <Text style={styles.actionLabel}>Wellness</Text>
          </TouchableOpacity>

          {/* Existing buttons continue */}
        </View>
      </View>

      {/* Show exercise suggestion if recent mood was anxious */}
      {recentMood === 'anxious' && (
        <ExerciseSuggestion
          mood="anxious"
          onPress={() => navigation.navigate('Exercise', { mood: 'anxious' })}
        />
      )}

      {/* Existing bottom sections */}
    </ScrollView>
  );
}
```

---

## Report Screen Integration (Priority 3)

### Display Exercise Statistics

```javascript
// In screens/ReportScreen.js

import { getWeeklyExerciseStats, calculateMoodImprovement } from '../services/activityService';
import { getAuth_ } from '../firebase';

export default function ReportScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExerciseStats();
  }, []);

  const fetchExerciseStats = async () => {
    try {
      setLoading(true);
      const user = getAuth_()?.currentUser;
      
      if (!user) {
        console.warn('No user authenticated');
        return;
      }

      const weeklyStats = await getWeeklyExerciseStats(user.uid);
      setStats(weeklyStats);
    } catch (error) {
      console.error('[ReportScreen] Error fetching exercise stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Existing report sections */}

      {/* NEW: Exercise Statistics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Wellness Activity</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#4A90E2" />
        ) : stats ? (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Exercises</Text>
              <Text style={styles.statValue}>{stats.totalExercises}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Breathing</Text>
              <Text style={styles.statValue}>{stats.breathingCount}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Grounding</Text>
              <Text style={styles.statValue}>{stats.groundingCount}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Time</Text>
              <Text style={styles.statValue}>
                {Math.round(stats.totalDuration / 60)}m
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>
            Start an exercise to see your wellness stats
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
```

---

## Get Exercise Recommendation

### Smart Suggestion Based on Mood

```javascript
// Usage in any component

import { getExerciseRecommendation } from '../services/activityService';

// Get recommendation
const recommendation = await getExerciseRecommendation('anxious');

// recommendation = {
//   suggested: true,
//   type: 'breathing',
//   pattern: '4-4-6',
//   message: 'Try a quick breathing exercise to calm your mind',
//   duration: 60
// }

// Use it
if (recommendation.suggested) {
  <ExerciseSuggestion
    mood={currentMood}
    onPress={() => navigation.navigate('Exercise', { mood: currentMood })}
  />
}
```

---

## Styling Examples

### Exercise Button Style
```javascript
const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
});
```

### Stats Grid Style
```javascript
const styles = StyleSheet.create({
  statsGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 0.48,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f5f9fc',
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A90E2',
  },
});
```

---

## Firestore Query Examples

### Get Today's Exercises
```javascript
import { getTodayActivities } from '../services/activityService';
import { getAuth_ } from '../firebase';

const user = getAuth_()?.currentUser;
const todayActivities = await getTodayActivities(user.uid);

// todayActivities = [
//   {
//     id: 'activity-123',
//     type: 'breathing',
//     pattern: '4-4-6',
//     cyclesCompleted: 5,
//     completed: true
//   },
//   // ...
// ]
```

### Calculate Mood Improvement
```javascript
import { calculateMoodImprovement } from '../services/activityService';

const improvement = calculateMoodImprovement('anxious', 'better');
// improvement = { improved: true, declined: false, stable: false, score: 1 }

const noChange = calculateMoodImprovement('happy', 'happy');
// noChange = { improved: false, declined: false, stable: true, score: 0 }
```

---

## Error Handling

### Try-Catch Pattern
```javascript
import { getWeeklyExerciseStats } from '../services/activityService';

const fetchStats = async () => {
  try {
    const stats = await getWeeklyExerciseStats(user.uid);
    setStats(stats);
  } catch (error) {
    console.error('[ComponentName] Error fetching stats:', error.message);
    Alert.alert(
      'Error',
      'Failed to load exercise statistics. Please try again.'
    );
  }
};
```

---

## State Management Pattern

### For Multiple Exercise Calls
```javascript
const [exerciseData, setExerciseData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const loadExerciseData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const data = await getWeeklyExerciseStats(user.uid);
    setExerciseData(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// Usage:
{loading && <ActivityIndicator />}
{error && <Text style={{color: 'red'}}>{error}</Text>}
{exerciseData && <ExerciseStats data={exerciseData} />}
```

---

## Environment Variables (if needed)

### .env
```
# Add to existing .env if custom backend is used
EXPO_PUBLIC_API_URL=http://localhost:5000
EXPO_PUBLIC_EXERCISE_FEATURE_ENABLED=true
```

### Accessing in Code
```javascript
const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
const exerciseEnabled = process.env.EXPO_PUBLIC_EXERCISE_FEATURE_ENABLED === 'true';
```

---

## Testing in Development

### Quick Test Navigation
```javascript
// Add temporary button to test screen
<Button
  title="Test Exercise"
  onPress={() => navigation.navigate('Exercise', { mood: 'anxious' })}
/>
```

### Check Firestore in Console
```javascript
// Temporary debug code
useEffect(() => {
  const fetchActivities = async () => {
    const user = getAuth_()?.currentUser;
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const activities = await getTodayActivities(user.uid);
    console.log('[DEBUG] Today activities:', activities);
  };
  fetchActivities();
}, []);
```

---

## Common Issues & Solutions

### Issue: "Exercise screen is blank"
**Solution:** 
- Verify `RootNavigator.js` has Exercise screen added
- Check that `navigation` prop is passed correctly
- Ensure theme context is available

### Issue: "No haptic feedback"
**Solution:**
- Check device supports haptics (Android 5.0+, iOS)
- Verify `expo-haptics` is installed: `npm list expo-haptics`
- Test on physical device (simulator may not support haptics)

### Issue: "Data not saved to Firestore"
**Solution:**
- Verify user is authenticated (check Firebase Auth)
- Check Firestore rules allow writes for authenticated users
- Check browser console/device logs for errors
- Verify network connection

### Issue: "Animations are choppy"
**Solution:**
- Use physical device (simulator is slower)
- Close other apps consuming resources
- Ensure `useNativeDriver: true` is set
- Check for heavy operations in render

---

## Performance Optimization Tips

### 1. Lazy Load Stats
```javascript
// Don't load all at once
const [stats, setStats] = useState(null);
const [todayActivities, setTodayActivities] = useState([]);

useEffect(() => {
  // Load stats only when report screen is focused
  return navigation.addListener('focus', () => {
    fetchStats();
  });
}, []);
```

### 2. Memoize Components
```javascript
import React, { memo } from 'react';

const ExerciseCard = memo(({ exercise, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    {/* Card content */}
  </TouchableOpacity>
));

export default ExerciseCard;
```

### 3. Use React.lazy for Heavy Imports
```javascript
// Defer heavy component loads
const ExerciseScreen = React.lazy(() => import('../screens/ExerciseScreen'));
```

---

## Debugging Console Commands

### React Native Developer Menu
```
Android: Shake device
iOS: Cmd+D

Options:
- Debug Remote JS (for console logs)
- Show Performance Monitor (watch FPS)
- Show Inspector (inspect element)
```

### Check Firestore Data
```javascript
// In console after debugging with Remote JS:
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const q = query(
  collection(db, 'activities'),
  where('userId', '==', 'current-user-id')
);
const snapshot = await getDocs(q);
console.log(snapshot.docs.map(doc => doc.data()));
```

---

## Production Deployment Checklist (Before eas build)

```javascript
// In ExerciseScreen.js - remove any debug logs:
// ❌ console.log('Debug info');
// ✅ Only keep error logs

// In ExerciseScreen.js - remove test code:
// ❌ <Button title="Test" onPress={() => console.log('test')} />

// In services/activityService.js - verify error messages are user-friendly:
// ❌ catch (err) { console.error(err); }
// ✅ catch (err) { console.error('Error:', err.message); }

// Verify Firestore security rules are set
// Verify theme provider is configured
// Verify i18n has all exercise keys
```

---

## Additional Resources

- **Full Implementation Docs**: See `EXERCISE_IMPLEMENTATION_COMPLETE.md`
- **Architecture Diagram**: See `EXERCISE_ARCHITECTURE.md`
- **Integration Guide**: See `EXERCISE_FEATURE.md`
- **Component Code**: `components/BreathingCircle.js`, `GroundingSteps.js`, `ExerciseSuggestion.js`
- **Service Code**: `services/activityService.js`
- **Main Screen**: `screens/ExerciseScreen.js`

