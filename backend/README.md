# AI Chat Backend - Setup & Deployment Guide

This is the secure backend server for the Mental Health AI Chat system. It handles all OpenAI API calls and Firestore integration.

## ⚠️ Security First

- **NEVER expose your OpenAI API key in the frontend**
- All API calls go through this backend
- The API key is stored only in the `.env` file on the server
- Frontend only knows the backend URL

## Prerequisites

- **Node.js 14+** (for Node.js backend) OR **Python 3.8+** (for Flask backend)
- **OpenAI API key** from https://platform.openai.com/api-keys

## Quick Start (Node.js/Express)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Create `.env` File

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env`:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=5000
```

### 3. Start Server

```bash
npm start
```

Output:
```
🚀 Mental health chat backend running on http://localhost:5000
✓ API Key configured: Yes
✓ Health check: GET http://localhost:5000/health
✓ Chat endpoint: POST http://localhost:5000/chat
```

### 4. Test Endpoint

```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "message": "I feel anxious today"
  }'
```

Expected response:
```json
{
  "response": "I hear you. Anxiety can feel overwhelming...",
  "userId": "test-user-123",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

## Quick Start (Python/Flask)

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Create `.env` File

```bash
cp .env.example .env
```

Edit `.env`:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=5000
```

### 4. Start Server

```bash
python server_flask.py
```

### 5. Test Endpoint

Same curl command as Node.js version above.

---

## API Endpoints

### Health Check
```
GET /health
```

Returns server status.

### Chat Endpoint
```
POST /chat
Content-Type: application/json

{
  "userId": "user_unique_id",
  "message": "User message text"
}
```

**Request:**
- `userId` (string, required): Firebase user ID
- `message` (string, required): User's message

**Response:**
```json
{
  "response": "AI response text",
  "userId": "user_unique_id",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Error Responses:**
- `400`: Missing/invalid fields
- `429`: Rate limited
- `500`: Server error

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | Your OpenAI API key |
| `PORT` | ❌ No | Server port (default: 5000) |
| `FRONTEND_URL` | ❌ No | Frontend URL for CORS |

### Frontend Integration

In React Native app, update the API URL in `services/apiService.js`:

**For Local Development:**
```javascript
const API_BASE_URL = 'http://192.168.1.52:5000'; // Your machine IP
```

**For Production:**
```javascript
const API_BASE_URL = 'https://your-backend-domain.com';
```

---

## System Prompt

The backend uses this system prompt for the AI assistant:

> "You are a supportive and empathetic mental health assistant. Your role is to provide compassionate, non-judgmental support using CBT (Cognitive Behavioral Therapy) principles and techniques."

Key features:
- Empathetic and validating responses
- CBT-based coping strategies
- No medical diagnosis
- Professional crisis referrals

---

## Deployment

### Heroku (Node.js)

1. Install Heroku CLI
2. Create `Procfile`:
   ```
   web: npm start
   ```
3. Deploy:
   ```bash
   heroku create your-app-name
   heroku config:set OPENAI_API_KEY=sk-your-key
   git push heroku main
   ```

### Railway (Python/Flask)

1. Push repo to GitHub
2. Connect to Railway
3. Set `OPENAI_API_KEY` in environment variables
4. Railway auto-detects Python and runs `python server_flask.py`

### AWS/Azure/GCP

Deploy as containerized app with Docker:

**Dockerfile:**
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

---

## Troubleshooting

### "OPENAI_API_KEY not found"
- Check `.env` file exists and is in `/backend` directory
- Verify API key is valid at https://platform.openai.com/api-keys
- Restart server after updating `.env`

### "Invalid API key"
- Verify key starts with `sk-`
- Check key hasn't been revoked in OpenAI dashboard
- Ensure no extra spaces in `.env`

### Frontend can't reach backend
- Verify backend URL in `apiService.js`
- Use your machine's IP address for local testing (not `localhost`)
- Ensure backend is running: `GET http://backend-url:5000/health`
- Check firewall isn't blocking port 5000

### Rate limiting (429 errors)
- OpenAI limits: 3,500 requests/minute for paid accounts
- Implement request queuing on frontend
- Add exponential backoff retry logic

### "Model not found" error
- Update model name in server code (currently `gpt-4o-mini`)
- Verify your OpenAI account has access to the model

---

## Best Practices

✅ **Do:**
- Store API keys in `.env` (never in code)
- Validate user input on backend
- Rate limit requests per user
- Log errors for debugging
- Use environment-specific configs

❌ **Don't:**
- Expose API keys in frontend
- Trust frontend validation alone
- Allow unlimited requests per user
- Log sensitive user data
- Hardcode credentials

---

## Support

For issues:
1. Check error logs in console
2. Verify API key and network connectivity
3. Test endpoint with curl
4. Check OpenAI API status: https://status.openai.com

---

## License

Private - Part of Agentic Mental Care system
