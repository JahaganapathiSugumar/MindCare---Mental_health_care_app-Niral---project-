# Deploy Flask RAG to Render (Remote)

Your Node.js backend is already hosted on Render at:
- **URL**: https://mindcare-mental-health-care-app-niral.onrender.com
- **Port**: 5000 (Node.js backend)

Now we'll deploy Flask RAG on a separate Render service at:
- **URL**: https://mindcare-rag.onrender.com (you choose this name)
- **Port**: 5001 (or auto-assigned by Render)

## 📋 Prerequisites

1. ✅ Render account (free tier works)
2. ✅ GitHub repository with the code pushed
3. ✅ Flask RAG code in `backend/rag/` directory

## 🚀 Deployment Steps

### **Step 1: Push Code to GitHub**

```bash
cd F:\Agentic_mental_care
git add .
git commit -m "Add Flask RAG deployment files"
git push origin main
```

### **Step 2: Create New Render Service for Flask RAG**

1. Go to [render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. **Service Configuration**:
   - **Name**: `mindcare-rag`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements_rag.txt`
   - **Start Command**: `cd backend/rag && python app.py`

### **Step 3: Set Environment Variables**

In Render dashboard, under **Environment**:

```
PORT=10000
RENDER=true
DEBUG=false
```

### **Step 4: Deploy**

1. Click **Deploy**
2. Wait for build to complete (3-5 minutes)
3. You'll get a URL like: `https://mindcare-rag-abc123.onrender.com`

### **Step 5: Ingest Knowledge Base (Important!)**

After deployment, ingest the documents remotely:

```bash
# Via curl from your local machine
curl -X POST https://mindcare-rag-abc123.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How to manage anxiety?",
    "user_id": "test",
    "top_k": 3
  }'
```

Or upload knowledge base files via the Flask app.

### **Step 6: Update Node.js Backend RAG_URL**

Update your Node.js backend's `.env`:

```env
RAG_URL=https://mindcare-rag-abc123.onrender.com
```

Then deploy the Node.js backend with the updated `.env`.

## ✅ Verify Integration

Test the integration:

```bash
# Test Node backend calling Flask RAG
curl -X POST https://mindcare-mental-health-care-app-niral.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "message": "How do I handle stress?",
    "language": "en"
  }'
```

**Expected response** should include:
```json
{
  "response": "AI response with knowledge base context...",
  "ragData": {
    "usingRag": true,
    "sources": ["Knowledge base content..."],
    "relevanceScores": [0.95, 0.87]
  }
}
```

## 🔧 Troubleshooting

### RAG service not responding
- Check Render logs: Dashboard → Service → Logs
- Ensure `RENDER=true` environment variable is set
- Verify RAG health: `https://mindcare-rag-abc123.onrender.com/health`

### Build fails
- Check Python version in `runtime.txt`
- Verify all dependencies in `requirements_rag.txt`
- Check Render logs for error details

### Knowledge base empty on remote
- RAG app needs to ingest documents first
- Run: `python backend/rag/ingest.py` locally to create FAISS index
- Ensure `faiss_index/` and `processed_files.json` are committed to git
- Or upload documents via Flask endpoint after deployment

## 📊 Architecture

```
Mobile App
    ↓
Node.js Backend (Render: port 5000)
https://mindcare-mental-health-care-app-niral.onrender.com
    ↓
Flask RAG (Render: port auto)
https://mindcare-rag-abc123.onrender.com
    ↓
FAISS + Knowledge Base
+ Grok/OpenAI API
    ↓
Response with context
```

## 💡 Notes

- Both services are independent and can be deployed separately
- RAG service only needs 512MB RAM (free tier works)
- Knowledge base is cached in FAISS for fast retrieval (~5ms per query)
- Node backend has 30-second health checks for RAG availability
- If RAG is down, Node backend still works (without knowledge context)

## 📞 Support URLs

After deployment:
- **Node Backend**: https://mindcare-mental-health-care-app-niral.onrender.com
- **RAG Service**: https://mindcare-rag-abc123.onrender.com
- **RAG Health**: https://mindcare-rag-abc123.onrender.com/health
- **RAG Stats**: https://mindcare-rag-abc123.onrender.com/stats
