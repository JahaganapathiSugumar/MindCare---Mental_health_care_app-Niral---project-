# Agentic AI System Design

This project now includes an agentic backend layer that proactively evaluates user wellbeing signals and triggers support actions.

## 1) Implemented Agents

### A. Proactive Notification Agent

Trigger conditions:
- Inactivity >= 24 hours (`lastActive` or `lastChatAt`)
- Mood drop detected over recent mood entries (`moods` collection)

Actions:
- Sends push reminder via Expo Push API
- Logs actions to `agent_events`

Relevant backend logic:
- `evaluateAgentDecisions(...)` in `backend/server.js`
- Endpoint: `POST /agents/evaluate`
- Scheduled sweep: hourly (`runInactivitySweep`)

### B. Daily Reflection Agent

Trigger conditions:
- Daily schedule at 9 PM (default; configurable)

Inputs:
- Recent `chats`
- Recent `moods`

Outputs:
- AI-generated summary in user language
- Stored in Firestore `reflections`

Relevant backend logic:
- `generateAndStoreDailyReflection(...)` in `backend/server.js`
- Endpoint: `POST /agents/reflections/run`
- Scheduled sweep: daily at configured hour (`runDailyReflectionSweep`)

### C. Crisis Detection Agent

Trigger conditions:
- Crisis keywords + strong negative signal in incoming message

Actions:
- Immediate supportive safety response
- Sets structured crisis flags for UI
- Recommends professional/emergency support

Relevant backend logic:
- `analyzeCrisisSignal(...)` in `backend/server.js`
- Chat endpoint returns `crisis` object in `POST /chat` response

### D. Smart Suggestion Agent

Trigger conditions:
- Every chat request

Inputs:
- Current message
- Detected mood
- User language

Outputs:
- 2-3 short actionable suggestions

Relevant backend logic:
- `generateSuggestionsFromMessage(...)` in `backend/server.js`

## 2) Firestore Schema

### users/{userId}

```json
{
  "lastActive": "ISO_DATE",
  "lastChatAt": "ISO_DATE",
  "lastMood": "sad|anxious|neutral|happy",
  "preferredLanguage": "en|ta|hi|ml",
  "pushToken": "ExpoPushToken[...]",
  "notificationsEnabled": true
}
```

### chats/{chatId}

```json
{
  "userId": "uid",
  "message": "string",
  "response": "string",
  "detectedMood": "sad|anxious|neutral|happy",
  "timestamp": "Firestore Timestamp / ISO"
}
```

### moods/{moodId}

```json
{
  "userId": "uid",
  "mood": "sad|anxious|neutral|happy",
  "source": "ai|manual",
  "timestamp": "Firestore Timestamp / ISO"
}
```

### reflections/{reflectionId}

```json
{
  "userId": "uid",
  "summary": "Today you felt anxious in the afternoon but calmer later.",
  "timestamp": "ISO_DATE",
  "source": "daily-reflection-agent",
  "signals": {
    "moodCount": 4,
    "chatCount": 6
  }
}
```

### agent_events/{eventId}

```json
{
  "userId": "uid",
  "actions": [
    {
      "type": "inactivity_reminder",
      "triggered": true,
      "pushSent": true
    }
  ],
  "createdAt": "ISO_DATE",
  "source": "decision-layer"
}
```

## 3) Prompt Templates

### Core assistant prompt

```text
You are a supportive mental health assistant.
Respond ONLY in {language}.
Be empathetic and simple.

User: {message}
```

### Daily reflection prompt

```text
You are an intelligent mental health assistant.
Analyze user data and generate:
- insights
- suggestions
- warnings (if needed)

Rules:
- Keep it supportive and non-judgmental.
- Keep summary under 45 words.
- Mention one clear mood trend from today.
- Respond strictly in {language}.

Mood entries: {moods}
Chat entries: {chats}
```

## 4) Scheduler

Configured in backend startup (`initializeAgentScheduler`):
- Hourly: inactivity + mood-drop evaluation
- Daily at configurable hour: reflection generation

Environment variables:
- `AGENT_TIMEZONE` (default: `Asia/Kolkata`)
- `REFLECTION_HOUR` (default: `21`)
- `INACTIVITY_CHECK_HOURS` (default: `24`)

## 5) Frontend Integration Points

### Chat screen
- Uses crisis metadata from `/chat`
- Displays emergency alert when `crisis.showEmergencyAlert === true`

### Home screen
- Fetches reflections from `GET /reflections/:userId`
- Triggers decision layer via `POST /agents/evaluate`
- Renders reflection cards under AI insights

### API service additions
- `fetchDailyReflections(userId, limit)`
- `runAgentEvaluation(userId, language)`
- `sendMessageToAI` now includes `crisis` in response

## 6) Deployment Notes

For backend Firestore access, set:

- `FIREBASE_SERVICE_ACCOUNT` = full JSON string of service account credentials

Without this variable, scheduler and reflection persistence run in degraded mode and skip Firestore admin operations.
