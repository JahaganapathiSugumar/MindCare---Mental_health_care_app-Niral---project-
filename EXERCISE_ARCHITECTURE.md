# Exercise Feature - Architecture Overview

## App Navigation Flow

```
RootNavigator
├── Authenticated User Flow
│   ├── Home Screen
│   │   ├── Quick Actions
│   │   │   └── [NEW] Start Exercise ──→ ExerciseScreen
│   │   └── [NEW] Exercise Suggestion Card (if sad/anxious)
│   │
│   ├── Chat Screen  
│   │   ├── AI Mood Detection
│   │   └── [NEW] ExerciseSuggestion (if anxious) ──→ ExerciseScreen
│   │
│   ├── [NEW] Exercise Screen (4-state machine)
│   │   ├── Menu (Exercise Selection)
│   │   │   ├── Calm Breathing (4-4-6)
│   │   │   ├── Deep Calm (4-7-8)
│   │   │   └── 5-4-3-2-1 Grounding
│   │   │
│   │   ├── Breathing State
│   │   │   └── BreathingCircle (animated)
│   │   │       ├── Inhale Phase (4s)
│   │   │       ├── Hold Phase (4s)
│   │   │       └── Exhale Phase (6s)
│   │   │
│   │   ├── Grounding State
│   │   │   └── GroundingSteps (5 steps)
│   │   │       ├── See (5 items)
│   │   │       ├── Feel (4 items)
│   │   │       ├── Hear (3 items)
│   │   │       ├── Smell (2 items)
│   │   │       └── Taste (1 item)
│   │   │
│   │   └── Complete State (celebration)
│   │
│   ├── Report Screen
│   │   ├── [NEW] Weekly Exercise Stats
│   │   ├── [NEW] Mood Improvement Chart
│   │   └── [NEW] Activity Timeline
│   │
│   └── Profile Screen
│       └── (Optional) Exercise Preferences
│
└── Unauthenticated User Flow
    ├── Sign In / Sign Up
    └── (Exercise unavailable until authenticated)
```

---

## Component Hierarchy

```
ExerciseScreen (screens/ExerciseScreen.js)
│
├── Menu State
│   └── LinearGradient Cards
│       ├── BreathingCard (Calm Breathing)
│       ├── BreathingCard (Deep Calm)
│       └── GroundingCard (5-4-3-2-1)
│
├── Breathing State
│   ├── BreathingCircle (components/BreathingCircle.js)
│   │   ├── Animated.View (main circle)
│   │   ├── Animated.View (pulse ring)
│   │   ├── Text (phase label)
│   │   ├── ProgressBar
│   │   └── Tips Box
│   │
│   └── Controls
│       ├── Start/Stop Button
│       └── Mood Selector (after completion)
│
├── Grounding State
│   ├── GroundingSteps (components/GroundingSteps.js)
│   │   ├── StepIndicator (5/5)
│   │   ├── StepLabel & Emoji
│   │   ├── TextInput (collect responses)
│   │   ├── Items List
│   │   ├── Navigation (Back/Skip)
│   │   └── Tips Box
│   │
│   └── onComplete callback
│       └── saveGroundingActivity()
│
└── Complete State
    ├── Celebration Emoji (🎉)
    ├── Title & Message
    ├── Stats Box
    └── Back to Menu Button
```

---

## Data Flow: Exercise → Firestore

```
User starts exercise
    ↓
ExerciseScreen captures:
  - beforeMood (optional, from route.params or selection)
  - exerciseType (breathing / grounding)
  - selectedPattern (4-4-6, 4-7-8, 5-4-3-2-1)
    ↓
User completes exercise
    ↓
afterMood selection (Better/Same/Worse)
    ↓
Call: saveExerciseActivity(userId, exerciseData)
    ↓
activityService.js:
  - Validates data
  - Creates document object
  - Adds serverTimestamp()
  - Saves to Firestore "activities" collection
    ↓
Firestore Document Created:
{
  userId: "firebase-user-id",
  type: "breathing" / "grounding",
  pattern: "4-4-6" / "4-7-8" / "5-4-3-2-1",
  duration: 180,  // seconds
  beforeMood: "anxious" / null,
  afterMood: "better" / "same" / "worse",
  cyclesCompleted: 5,  // for breathing
  completed: true,
  notes: JSON.stringify(responses),  // for grounding
  timestamp: <Firestore Timestamp>,
  createdAt: "ISO-8601 string"
}
    ↓
User navigates away or sees "Great Job!" celebration
    ↓
Activity data persisted in Firestore
    ↓
Weekly stats can be queried: getWeeklyExerciseStats(userId)
```

---

## Mood Detection & Exercise Suggestion Flow

```
User sends message in Chat
    ↓
chatService.js analyzes message content + AI response
    ↓
AI infers mood (anxious, sad, happy, etc.)
    ↓
Mood saved to "moodHistory" collection
    ↓
ChatScreen detects anxious mood
    ↓
Call: getExerciseRecommendation('anxious')
    ↓
activityService returns:
{
  suggested: true,
  type: 'breathing',
  pattern: '4-4-6',
  message: 'Try a quick breathing exercise...',
  duration: 60
}
    ↓
Render ExerciseSuggestion component:
  - Display recommendation card
  - Show mood indicator
  - Add action button
    ↓
User taps suggestion
    ↓
navigation.navigate('Exercise', { mood: 'anxious' })
    ↓
ExerciseScreen opens with pre-filled mood
    ↓
User completes exercise
    ↓
Mood improvement tracked (beforeMood vs afterMood)
```

---

## Service Architecture

```
activityService.js (Core service)
│
├── saveExerciseActivity(userId, data)
│   ├── Validates input
│   ├── Adds timestamps
│   ├── Firestore.addDoc("activities", doc)
│   └── Returns {id, ...data}
│
├── getTodayActivities(userId)
│   ├── Query where userId == uid
│   ├── Query where date == today
│   └── Returns array of activities
│
├── getExerciseRecommendation(mood)
│   ├── If mood === 'anxious' → breathing exercise
│   ├── If mood === 'sad' → grounding exercise
│   ├── If mood === 'stressed' → breathing exercise
│   └── Returns {suggested, type, pattern, message, duration}
│
├── getWeeklyExerciseStats(userId)
│   ├── Query last 7 days
│   ├── Count exercises by type
│   ├── Sum total duration
│   └── Returns {totalExercises, breathingCount, groundingCount, totalDuration}
│
└── calculateMoodImprovement(beforeMood, afterMood)
    ├── Score: better=+1, same=0, worse=-1
    ├── Returns {improved: boolean, score: number, ...}
    └── Used for analytics
```

---

## State Management in ExerciseScreen

```
ExerciseScreen Component
│
├── Navigation State
│   └── screen: 'menu' | 'breathing' | 'grounding' | 'complete'
│
├── Exercise Selection State
│   └── selectedPattern: '4-4-6' | '4-7-8' | null
│
├── Breathing State
│   ├── isBreathing: boolean (animation running)
│   ├── cycleCount: number (0 to maxCycles)
│   └── maxCycles: number (4 or 5)
│
├── Mood State
│   ├── beforeMood: string | null (from route.params or selected)
│   └── afterMood: string | null (selected after exercise)
│
├── UI State
│   ├── elapsedTime: number (tracked but not displayed)
│   ├── saving: boolean (Firestore operation in progress)
│   └── fadeAnim: Animated.Value (screen transitions)
│
└── Data Flow
    └── All state → Firestore on completion
```

---

## Theming & i18n Integration

```
Theme Support:
├── Dark Mode
│   ├── Background: #0a0a0a
│   ├── Cards: #1a1a1a
│   ├── Text: #ffffff
│   └── Primary: #4A90E2
│
└── Light Mode
    ├── Background: #f5f9fc
    ├── Cards: #ffffff
    ├── Text: #333333
    └── Primary: #4A90E2

Language Support (i18n):
├── English (en.json) - 30+ exercise keys
├── Hindi (hi.json) - Translated keys
├── Malayalam (ml.json) - Translated keys
└── Tamil (ta.json) - Translated keys

Keys namespace: "exercise.*"
├── exercise.title
├── exercise.calmBreathing
├── exercise.deepCalm
├── exercise.grounding
├── exercise.inhale
├── exercise.hold
├── exercise.exhale
└── ... (30+ total keys)
```

---

## Animation Performance

```
BreathingCircle Animation (60fps target)
│
├── useNativeDriver: true (offloads to native thread)
│
├── Phase Animations
│   ├── Inhale: scale 1 → 1.4 (4 seconds)
│   ├── Hold: scale stays 1.4 (4 seconds)
│   └── Exhale: scale 1.4 → 1 (6 seconds)
│
├── Pulse Ring (continuous loop)
│   ├── Opacity: 0.1 → 0.3 → 0.1 (1.5 second cycle)
│   └── Scale: 1 → 1.2 → 1 (1.5 second cycle)
│
└── Progress Bar
    └── Linear animation based on cycle count
```

---

## Firestore Security Rules (Recommended)

```firebase
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own activities
    match /activities/{docId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    // Activities collection accessible to authenticated users
    match /activities/{document=**} {
      allow list: if request.auth != null;
    }
  }
}
```

---

## File Dependencies

```
screens/ExerciseScreen.js
├── Imports:
│   ├── react-native (core UI)
│   ├── expo-linear-gradient (card backgrounds)
│   ├── @expo/vector-icons (icons)
│   ├── expo-haptics (feedback)
│   ├── ../components/BreathingCircle
│   ├── ../components/GroundingSteps
│   ├── ../services/activityService
│   └── ../firebase
│
components/BreathingCircle.js
├── Imports:
│   ├── react-native (animated)
│   ├── ../context/ThemeContext
│   └── react-i18next (optional)
│
components/GroundingSteps.js
├── Imports:
│   ├── react-native (core UI)
│   ├── react-native-safe-area-context
│   ├── ../context/ThemeContext
│   ├── ../components/CustomButton
│   └── react-i18next
│
components/ExerciseSuggestion.js
├── Imports:
│   ├── react-native (animated)
│   ├── expo-linear-gradient
│   ├── ../context/ThemeContext
│   └── react-i18next
│
services/activityService.js
├── Imports:
│   ├── firebase/firestore
│   └── ../firebase
```

---

## Integration Checklist

### For Chat Screen Integration
- [ ] Import ExerciseSuggestion component
- [ ] Import getExerciseRecommendation from activityService
- [ ] Add state for showExerciseSuggestion
- [ ] Detect mood from AI response
- [ ] Show suggestion when anxious
- [ ] Handle onPress → navigation.navigate('Exercise', {mood})

### For Home Screen Integration
- [ ] Import navigation prop
- [ ] Add "Start Exercise" button in QuickActions
- [ ] Handle onPress → navigation.navigate('Exercise')
- [ ] Optional: Show recent exercise stats

### For Report Screen Integration
- [ ] Import getWeeklyExerciseStats from activityService
- [ ] Fetch stats on component mount
- [ ] Display exercise frequency chart
- [ ] Show mood improvement metrics
- [ ] Add "View All Activities" button

---

## Testing Paths

### End-to-End Flow
```
1. Sign In
2. Navigate to Exercise
3. Select Calm Breathing
4. Tap Start (haptic feedback)
5. Wait 10 seconds
6. Tap Stop
7. Select "Better" mood
8. See celebration screen
9. Check Firestore "activities" collection
10. Verify document created with userId
```

### Integration Flow
```
1. Sign In
2. Go to Chat
3. Detect anxious mood in AI response
4. Tap ExerciseSuggestion card
5. Complete breathing exercise
6. Check Firestore for activity record
7. Verify mood tracking (before/after)
```

---

## Production Deployment Checklist

- [ ] All components tested on Android device
- [ ] All components tested on iOS device
- [ ] Firestore security rules configured
- [ ] Error messages reviewed (no PII)
- [ ] Performance profiled (60fps target met)
- [ ] Bundle size acceptable (<50KB)
- [ ] Dark mode tested
- [ ] All 4 languages tested
- [ ] Haptic feedback working
- [ ] Network error handling tested
- [ ] Build passes: `eas build --platform android/ios`
- [ ] Update deployed: `eas update --channel production`

