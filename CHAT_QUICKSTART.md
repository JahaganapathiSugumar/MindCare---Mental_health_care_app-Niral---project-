# AI Chat System - Quick Start Checklist

Complete this checklist to get your AI chat system up and running.

## ✅ Prerequisites

- [ ] Node.js v14+ installed (check: `node -v`)
- [ ] OpenAI API key (get from https://platform.openai.com/api-keys)
- [ ] Firebase project already set up (from previous steps)

---

## ✅ Frontend Setup (React Native/Expo)

- [ ] New dependencies added to `package.json`:
  - `axios` - HTTP client
  - `react-native-gifted-chat` - Chat UI

- [ ] New frontend files created:
  - [ ] `screens/ChatScreen.js` - Main chat UI
  - [ ] `services/apiService.js` - Backend API calls
  - [ ] `services/chatService.js` - Firestore operations

- [ ] Navigation updated:
  - [ ] `RootNavigator.js` - Chat route added
  - [ ] `ProfileScreen.js` - Chat button added

- [ ] Install packages:
  ```bash
  npm install
  ```

---

## ✅ Backend Setup (Node.js)

### Quick Setup
```bash
cd backend
./setup.sh  # On Windows: setup.bat
```

OR Manual Setup:

1. [ ] Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

2. [ ] Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. [ ] Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   PORT=5000
   ```

4. [ ] Test backend startup:
   ```bash
   npm start
   ```
   Should see: `🚀 Mental health chat backend running on http://localhost:5000`

5. [ ] Test health endpoint:
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"OK","message":"Mental health chat backend is running"}`

6. [ ] Test chat endpoint:
   ```bash
   curl -X POST http://localhost:5000/chat \
     -H "Content-Type: application/json" \
     -d '{"userId":"test-user","message":"I feel anxious"}'
   ```
   Should return: AI response in JSON format

---

## ✅ Configure Frontend for Backend

1. [ ] Find your machine's IP address:
   - Windows: `ipconfig | find "IPv4"`
   - Mac/Linux: `ifconfig | grep inet`

2. [ ] Update `services/apiService.js` (line 3):
   ```javascript
   const API_BASE_URL = 'http://YOUR_IP_ADDRESS:5000';
   ```
   Example: `'http://192.168.1.52:5000'`

3. [ ] Start frontend:
   ```bash
   npm start
   ```

---

## ✅ Test Complete System

1. [ ] Open app and sign in with test account

2. [ ] Navigate to Profile screen

3. [ ] Click "Talk to AI Support Assistant" button

4. [ ] Send a test message:
   - Example: "I feel anxious about tomorrow"

5. [ ] Verify response appears:
   - Message should show on left with 🤖 avatar
   - Response should be supportive and CBT-based

6. [ ] Check Firestore:
   - Go to Firebase Console
   - Check `chats` collection
   - Verify message and response were saved with timestamp

---

## ✅ Firestore Collections Setup

For best results, create the `chats` collection first:

1. [ ] Go to Firebase Console
2. [ ] Firestore Database → Create Collection
3. [ ] Collection ID: `chats`
4. [ ] Add test document with fields:
   - `userId`: "test"
   - `message`: "Hello"
   - `response`: "Hi there"
   - `timestamp`: (auto-server timestamp)

---

## 📱 Optional: Deploy Backend

### Heroku (Node.js)
```bash
heroku login
heroku create your-app-name
heroku config:set OPENAI_API_KEY=sk-your-key
git push heroku main
```

### Railway.app (Easiest)
1. Push code to GitHub
2. Connect to Railway
3. Set `OPENAI_API_KEY` environment variable
4. Deploy (auto-detects Node.js)

### Update Frontend URL
```javascript
// In services/apiService.js
const API_BASE_URL = 'https://your-deployed-backend.herokuapp.com';
```

---

## 🧪 Troubleshooting

### "Failed to get response from AI"
- [ ] Backend running? Check: `curl http://localhost:5000/health`
- [ ] Correct IP in `apiService.js`?
- [ ] Firewall blocking port 5000?
- [ ] Backend logs show errors?

### "Invalid API key"
- [ ] Check key starts with `sk-`
- [ ] Key is in `.env` file in `backend/` folder?
- [ ] No extra spaces in `.env`?
- [ ] Key not revoked in OpenAI dashboard?

### "Can't connect to backend"
- [ ] Find correct IP: `ipconfig`
- [ ] Update `apiService.js` with correct IP
- [ ] Test with curl: `curl http://IP:5000/health`

### Chat not saving to Firestore
- [ ] User authenticated? (Check Firebase Console)
- [ ] Firestore database created?
- [ ] Firestore rules allow write? (Test mode = allows)
- [ ] Check browser console for errors

---

## 📊 System Architecture

```
React Native App (Expo)
    ↓
ChatScreen.js (GiftedChat UI)
    ↓ (HTTP POST)
services/apiService.js → Backend Server (:5000)
    ↓ (Secure API Key)
OpenAI API → AI Response
    ↓
Display in ChatScreen
    ↓
services/chatService.js → Save to Firestore
```

---

## 🔐 Security Checklist

- [ ] API key in `.env` (NEVER in code)
- [ ] `.env` in `.gitignore` (NEVER commit keys)
- [ ] Frontend only calls backend endpoint
- [ ] Backend has HTTPS in production
- [ ] Firebase rules secure (not test mode in prod)
- [ ] No PII logged in error messages

---

## 📚 Documentation

- [CHAT_SYSTEM.md](../CHAT_SYSTEM.md) - Complete system guide
- [backend/README.md](backend/README.md) - Backend setup details
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)

---

## ✨ Next Features to Consider

- [ ] Allow users to start new conversations
- [ ] Delete/clear chat history
- [ ] Export conversation as PDF
- [ ] Connect mood tracking to chat
- [ ] Message search functionality
- [ ] Different AI personalities (therapist, coach, friend)
- [ ] Crisis detection and escalation

---

**Status:** 🟢 Ready to implement

**Questions?** Check documentation files or review code comments in:
- `screens/ChatScreen.js`
- `backend/server.js`
- `services/chatService.js`
