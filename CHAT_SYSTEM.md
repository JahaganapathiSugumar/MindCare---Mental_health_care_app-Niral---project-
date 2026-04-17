# AI-Powered Chat System - Complete Setup Guide

This guide explains how to set up and use the complete AI chat system with React Native, Firebase, and OpenAI integration.

## 📋 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React Native App (Expo)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ChatScreen.js - UI with GiftedChat                    │ │
│  │  - User messages on right, AI on left                  │ │
│  │  - Typing indicator "AI is typing..."                  │ │
│  │  - Auto-scroll to latest message                       │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Services Layer                                        │ │
│  │  - apiService.js → Backend API calls                   │ │
│  │  - chatService.js → Firestore read/write               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP POST /chat
                          │
┌─────────────────────────────────────────────────────────────┐
│              Backend Server (Node.js or Flask)              │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │  /chat Endpoint                                        │ │
│  │  - Receives: { userId, message }                       │ │
│  │  - Calls OpenAI API (API KEY SECURE HERE)             │ │
│  │  - Returns: { response, userId, timestamp }            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
┌──────────────────────────┴──────────────────────────────────┐
│                    Cloud Services                           │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────────────────┐ │
│  │  Firebase/Auth     │  │  OpenAI API                    │ │
│  │  - User ID         │  │  - gpt-4o-mini model           │ │
│  │  - Session mgmt    │  │  - CBT-based system prompt     │ │
│  └────────────────────┘  └────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Firestore Database                                    │ │
│  │  - "chats" collection (user: message + response)       │ │
│  │  - Timestamp-based sorting                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Security Features

1. **API Key Protection:**
   - OpenAI API key stored ONLY in backend `.env`
   - Never exposed in frontend code
   - Frontend calls backend endpoint (no direct OpenAI access)

2. **Authentication:**
   - Firebase Authentication required
   - Backend receives Firebase user ID
   - All messages tied to authenticated user

3. **Data Privacy:**
   - All messages saved to Firestore with user ID
   - HTTPS in production (not HTTP)
   - No PII exposed in error messages

## 📱 Frontend Setup

### 1. Install Dependencies

```bash
npm install
```

This includes:
- `react-native-gifted-chat` - Chat UI
- `axios` - HTTP client
- Firebase, React Navigation, and other existing dependencies

### 2. Project Structure

```
screens/
  ├── ChatScreen.js          ← New AI chat screen
  ├── ProfileScreen.js       ← (Updated with Chat button)
  ├── SignInScreen.js
  └── SignUpScreen.js

services/
  ├── apiService.js          ← New backend API calls
  ├── chatService.js         ← New Firestore operations
  └── profileService.js      ← (Existing profile operations)

navigation/
  └── RootNavigator.js       ← (Updated with Chat route)

components/
  ├── ProfileHeader.js
  ├── InfoCard.js
  ├── MoodItem.js
  ├── CustomInput.js
  └── CustomButton.js
```

### 3. Configure Backend URL

Edit `services/apiService.js` line 3:

**Local Development (testing on your phone/emulator):**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://YOUR_MACHINE_IP:5000';
// Example: 'http://192.168.1.52:5000'
```

**Production:**
```javascript
const API_BASE_URL = 'https://your-backend-domain.com';
```

### 4. Run Frontend

```bash
npm start
```

Then:
- Scan QR code with Expo Go (Android)
- Or press `a` for Android emulator
- Or press `i` for iOS simulator

## 🚀 Backend Setup

### Option A: Node.js/Express (Recommended)

**Step 1: Install Dependencies**
```bash
cd backend
npm install
```

**Step 2: Create `.env` File**
```bash
cp .env.example .env
```

Edit `backend/.env`:
```
OPENAI_API_KEY=sk-your-actual-api-key-from-openai
PORT=5000
```

Get your API key:
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and paste into `.env`

**Step 3: Start Server**
```bash
npm start
```

Should see:
```
🚀 Mental health chat backend running on http://localhost:5000
✓ API Key configured: Yes
✓ Health check: GET http://localhost:5000/health
✓ Chat endpoint: POST http://localhost:5000/chat
```

**Step 4: Test It**
```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "message": "I feel anxious today"
  }'
```

---

### Option B: Python/Flask

**Step 1: Create Virtual Environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

**Step 2: Install Dependencies**
```bash
pip install -r requirements.txt
```

**Step 3: Create `.env` File**
```bash
cp .env.example .env
```

Edit with your OpenAI API key (same as Node.js)

**Step 4: Start Server**
```bash
python server_flask.py
```

Should see:
```
🚀 Mental health chat backend running on http://localhost:5000
```

## 🔗 Complete Message Flow

### When User Sends a Message:

1. **Frontend - ChatScreen.js**
   ```javascript
   // User types: "I feel sad"
   // Press send button
   ```

2. **Frontend - Instantly Add to UI**
   ```javascript
   // Message appears immediately on right side
   setMessages((prev) => GiftedChat.append(prev, [userMessage]));
   ```

3. **Frontend - Show Typing Indicator**
   ```javascript
   // "AI is typing..." appears below chat
   ```

4. **Frontend - Call Backend API**
   ```javascript
   const result = await sendMessageToAI(userId, "I feel sad");
   // HTTP POST to http://backend:5000/chat
   ```

5. **Backend - Receive & Process**
   ```javascript
   // Receives: { userId: "abc123", message: "I feel sad" }
   // Creates OpenAI request with system prompt
   ```

6. **Backend - Call OpenAI**
   ```javascript
   // Uses SECURE API key from environment
   const response = await openai.chat.completions.create({
     model: 'gpt-4o-mini',
     messages: [
       { role: 'system', content: 'You are a supportive mental health assistant...' },
       { role: 'user', content: 'I feel sad' }
     ]
   });
   // Returns: "I hear you. Feeling sad is valid..."
   ```

7. **Backend - Return Response**
   ```javascript
   res.json({
     response: "I hear you. Feeling sad is valid...",
     userId: "abc123",
     timestamp: "2024-01-20T10:30:00Z"
   });
   ```

8. **Frontend - Display Response**
   ```javascript
   // Message appears on left side with 🤖 avatar
   // "I hear you. Feeling sad is valid..."
   ```

9. **Frontend - Save to Firestore**
   ```javascript
   await saveChatMessage(
     "I feel sad",
     "I hear you. Feeling sad is valid..."
   );
   // Collection: "chats"
   // Fields: userId, message, response, timestamp
   ```

10. **Hide Typing Indicator**
    ```javascript
    // Done!
    ```

## 📊 Firestore Structure

### Collection: `chats`

```
chats/
  └── {auto_doc_id}
      ├── userId: "firebase-user-id-123"
      ├── message: "I feel sad"
      ├── response: "I hear you. Feeling sad is valid..."
      ├── timestamp: Timestamp(2024-01-20, 10:30:00)
      └── createdAt: "2024-01-20T10:30:00.000Z"
```

**Example Document:**
```json
{
  "userId": "abc123xyz",
  "message": "I'm having trouble sleeping",
  "response": "Sleep difficulties can be very challenging. Let's explore what might help. Have you noticed any patterns with when you sleep best?",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "createdAt": "2024-01-20T10:30:00.000Z"
}
```

## 🎯 Key Features Implemented

✅ **Chat UI:**
- WhatsApp-style messages (user right, AI left)
- Avatars for each message
- Timestamps
- Auto-scroll to latest
- Typing indicator

✅ **Message Flow:**
- Instant user message display
- Loading state management
- Error handling with retry
- Fallback messages

✅ **Firestore Integration:**
- Auto-save all conversations
- Load chat history on screen open
- Sort by timestamp (oldest to newest)
- User-specific data (userId filtering)

✅ **Security:**
- API key in backend only
- No direct OpenAI calls from frontend
- Firebase Auth required
- HTTPS ready (for production)

✅ **UX Enhancements:**
- Loading spinner during API call
- Send button disabled while processing
- Retry option on failure
- User-friendly error messages
- Smooth animations

## ⚙️ System Prompt

The backend uses this prompt to guide AI responses:

> "You are a supportive and empathetic mental health assistant. Your role is to provide compassionate, non-judgmental support using CBT (Cognitive Behavioral Therapy) principles and techniques."

Key behaviors:
- Validates emotions
- Asks helpful follow-up questions
- Provides coping strategies
- Does NOT provide medical diagnosis
- Recommends professional help for severe issues

## 🧪 Testing

### Test Local Setup

1. **Start Backend:**
   ```bash
   cd backend
   npm start  # or: python server_flask.py
   ```

2. **Test Health Check:**
   ```bash
   curl http://localhost:5000/health
   ```

3. **Test Chat Endpoint:**
   ```bash
   curl -X POST http://localhost:5000/chat \
     -H "Content-Type: application/json" \
     -d '{"userId":"test","message":"Hello"}'
   ```

4. **Start Frontend:**
   ```bash
   npm start
   ```

5. **Test in App:**
   - Sign in with test account
   - Navigate to Profile
   - Click "Talk to AI Support Assistant"
   - Type a message and send
   - Watch for response

## 🚨 Troubleshooting

### Frontend can't reach backend

**Problem:** "Failed to get response from AI"

**Solutions:**
1. Verify backend is running: `curl http://localhost:5000/health`
2. Check you're using correct IP address (not `localhost`)
   ```
   On Windows: ipconfig | find "IPv4"
   On Mac/Linux: ifconfig | grep inet
   ```
3. Update `apiService.js` with correct IP
4. Check firewall allows port 5000

### "Invalid API key" error

**Problem:** Backend gets 401 from OpenAI

**Solutions:**
1. Get new key: https://platform.openai.com/api-keys
2. Paste into `.env` file
3. Restart backend server
4. Ensure no extra spaces in `.env`

### "Rate limited" (429 errors)

**Problem:** Too many requests to OpenAI

**Solutions:**
1. Wait a few minutes before retrying
2. Add delays between messages
3. Check OpenAI usage: https://platform.openai.com/account/billing/overview
4. Upgrade to paid plan for higher limits

### Chat history not saving

**Problem:** Messages appear in chat but not in Firestore

**Solutions:**
1. Verify user is authenticated
2. Check Firestore rules allow write access
3. Look for Firestore errors in console
4. Verify Firestore database exists in Firebase

## 📈 Production Deployment

### Frontend (Expo → Native App)

```bash
# Build production app
eas build --platform ios --auto-submit
eas build --platform android

# OR use managed hosting
expo publish
```

### Backend (Node.js → Heroku/Railway/AWS)

**Heroku Example:**
```bash
heroku create your-app-name
heroku config:set OPENAI_API_KEY=sk-your-key
git push heroku main
```

Update frontend URL:
```javascript
const API_BASE_URL = 'https://your-app-name.herokuapp.com';
```

## 📚 Additional Resources

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [React Native Gifted Chat](https://github.com/FaridSafi/react-native-gifted-chat)
- [Express.js Docs](https://expressjs.com/)
- [Flask Docs](https://flask.palletsprojects.com/)

## 💡 Next Steps

After setup, consider:
1. **Rate Limiting:** Implement per-user request limits
2. **Conversation Management:** Allow users to start new/delete conversations
3. **Mood Tracking:** Connect chat to mood history
4. **Caching:** Cache common responses for faster replies
5. **Analytics:** Track which topics users discuss
6. **Crisis Support:** Auto-detect crisis language and escalate

---

**Built with:** React Native • Expo • Firebase • OpenAI • Node.js/Flask

**Security First:** API keys secure, frontend API calls only, Firebase Auth required
