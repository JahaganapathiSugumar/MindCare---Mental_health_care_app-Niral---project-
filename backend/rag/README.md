# RAG System for Mental Health Chatbot

A production-ready Retrieval-Augmented Generation (RAG) system for a mental health chatbot using CBT (Cognitive Behavioral Therapy) knowledge base.

## Architecture Overview

```
CBT Knowledge (.docx)
        ↓
   [Document Loader]
        ↓
   [Text Chunking]
        ↓
   [Embeddings - OpenAI]
        ↓
   ┌─────────────┬──────────────┐
   ↓             ↓              ↓
[FAISS]     [Firebase]    [Local Storage]
Vector       Metadata        Chunks
Search       & Logs          Cache
   ↑
   └── [Query] → [Retrieval] → [Context] → [GPT-4] → [Response]
                                                        ↓
                                                   [Firebase Log]
```

## Components

### 1. **docx_loader.py** - Document Processing
- Loads CBT knowledge from .docx files
- Extracts text with section information
- Handles document structure and formatting

```python
from rag.docx_loader import load_cbt_knowledge

paragraphs = load_cbt_knowledge('data/cbt_knowledge.docx')
# Returns: [(section_title, text), ...]
```

### 2. **chunking.py** - Text Segmentation
- Splits text into optimal-sized chunks (100-300 words)
- Respects sentence boundaries
- Assigns unique chunk IDs and metadata

```python
from rag.chunking import chunk_cbt_knowledge

chunks = chunk_cbt_knowledge(paragraphs, min_size=100, max_size=300)
# Returns: [Chunk, Chunk, ...] with metadata
```

### 3. **embeddings.py** - Vector Representation
- Uses OpenAI's `text-embedding-3-small` model
- Generates embeddings for all chunks
- Batches requests for efficiency

```python
from rag.embeddings import embed_cbt_chunks

result = embed_cbt_chunks(chunks)
# Returns: {embeddings, chunk_ids, metadata, texts}
```

### 4. **faiss_store.py** - Vector Search
- Creates FAISS index for fast similarity search
- Stores embeddings locally
- Maintains chunk→text mappings
- Retrieves top-K relevant chunks

```python
from rag.faiss_store import FAISSStore, RAGRetriever

store = FAISSStore(dimension=1536)
store.add_embeddings(embeddings, chunk_ids, texts)
store.save()

retriever = RAGRetriever(store)
results = retriever.retrieve(query_embedding, top_k=3)
```

### 5. **firebase_handler.py** - Data Persistence
- Stores chunk metadata in Firestore
- Logs all chat interactions
- Maintains user chat history
- Caches frequent responses

```python
from rag.firebase_handler import FirebaseRAGHandler

firebase = FirebaseRAGHandler()
firebase.store_chunk_texts(chunks_data)
firebase.log_chat_interaction(user_id, message, response, context_used)
firebase.get_user_chat_history(user_id)
```

### 6. **app.py** - Flask API
- RESTful endpoints for chat and retrieval
- Integrates all RAG components
- Handles request processing pipeline

## Setup & Installation

### Prerequisites
```bash
Python 3.10+
pip
OpenAI API key
Firebase service account credentials
```

### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements_rag.txt
```

### Step 2: Configure Environment

Create `.env` file:
```bash
# OpenAI
OPENAI_API_KEY=sk_test_...

# Firebase
FIREBASE_CREDENTIALS_PATH=./firebase_credentials.json
FIREBASE_PROJECT_ID=your-project

# CBT Knowledge
CBT_KNOWLEDGE_FILE=./data/cbt_knowledge.docx

# RAG Settings
MIN_CHUNK_SIZE=100
MAX_CHUNK_SIZE=300
RETRIEVAL_TOP_K=3
ENABLE_CACHE=true

# API
API_PORT=5000
DEBUG=false
```

### Step 3: Prepare CBT Knowledge

Place your CBT knowledge document at `data/cbt_knowledge.docx`

Structure example:
```
# CBT Fundamentals

## What is CBT?
Cognitive Behavioral Therapy (CBT) is...

## Key Principles
1. Thoughts affect emotions
2. Behaviors influence thoughts
...

## Anxiety Management Techniques

### Breathing Exercises
...
```

### Step 4: Firebase Setup

1. Create Firebase project
2. Generate service account credentials
3. Save JSON file: `backend/firebase_credentials.json`
4. Create Firestore database with collections:
   - `cbt_chunks`
   - `chat_logs`
   - `users/{userId}/chat_history`
   - `response_cache`
   - `retrieval_metrics`

### Step 5: Run the System

```bash
# Initialize (first time)
python rag/app.py

# Or with rebuild
FORCE_REBUILD=true python rag/app.py
```

Server starts at `http://localhost:5000`

## API Endpoints

### 1. POST `/chat` - Chat with RAG Context
```json
Request:
{
  "message": "I'm feeling anxious about work",
  "user_id": "user123",
  "top_k": 3,
  "use_cache": true
}

Response:
{
  "response": "It's understandable to feel anxious...",
  "context_used": ["chunk_123", "chunk_456"],
  "relevance_scores": [0.95, 0.87],
  "sections_used": ["Anxiety Management", "Coping Techniques"],
  "model": "gpt-4",
  "retrieval_time_ms": 45.2,
  "total_time_ms": 1250.5,
  "from_cache": false
}
```

### 2. POST `/retrieve` - Get Context Only
```json
Request:
{
  "query": "How to manage anxiety?",
  "top_k": 3
}

Response:
{
  "query": "How to manage anxiety?",
  "results": [
    {
      "chunk_id": "chunk_123",
      "text": "Anxiety management techniques include...",
      "relevance_score": 0.95,
      "section": "Anxiety Management"
    }
  ]
}
```

### 3. GET `/stats` - System Statistics
```json
Response:
{
  "faiss": {
    "index_size": 1250,
    "dimension": 1536,
    "total_chunks": 1250
  },
  "firebase": {
    "total_chunks": 1250,
    "total_logs": 5432,
    "cache_entries": 234
  }
}
```

### 4. GET `/history/{user_id}` - Chat History
```json
Response:
{
  "user_id": "user123",
  "history": [...],
  "count": 42
}
```

### 5. GET `/health` - Health Check
```json
Response:
{
  "status": "healthy",
  "rag_initialized": true
}
```

## Performance Optimization

### Chunking Strategy
- **Size**: 100-300 words per chunk
- **Boundaries**: Respects sentence breaks
- **Metadata**: Section name + chunk ID

### Embedding Efficiency
- Batch processing (100 chunks at a time)
- Reuses existing embeddings
- Caches on disk (FAISS)

### Retrieval Speed
- FAISS Flat L2 index: ~1-5ms
- Top-K limit: Default 3 chunks
- Distance-to-relevance conversion

### Response Caching
- Query hash-based caching
- TTL: 24 hours (configurable)
- Hit tracking in Firebase

## Database Schema

### Firebase Collections

**`cbt_chunks`**
```javascript
{
  chunk_id: "chunk_xyz_abc123",
  text: "Full chunk text...",
  section: "Anxiety Management",
  original_index: 5,
  word_count: 245,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

**`chat_logs`**
```javascript
{
  user_id: "user123",
  message: "User's message",
  response: "AI's response",
  context_used: ["chunk_123", "chunk_456"],
  model: "gpt-4",
  timestamp: Timestamp,
  message_length: 42,
  response_length: 156,
  context_count: 2
}
```

**`users/{userId}/chat_history`**
```javascript
// Same structure as chat_logs, user-specific
```

**`response_cache`**
```javascript
{
  query_hash: "abc123def456",
  response: "Cached response...",
  context_used: ["chunk_123"],
  created_at: Timestamp,
  ttl_hours: 24,
  hit_count: 5
}
```

**`retrieval_metrics`**
```javascript
{
  query: "How to manage anxiety?",
  results_count: 3,
  avg_relevance: 0.92,
  retrieval_time_ms: 45.2,
  timestamp: Timestamp
}
```

## File Structure

```
backend/
├── rag/
│   ├── __init__.py
│   ├── app.py              # Flask API
│   ├── config.py           # Configuration
│   ├── docx_loader.py      # Document loading
│   ├── chunking.py         # Text segmentation
│   ├── embeddings.py       # OpenAI embeddings
│   ├── faiss_store.py      # FAISS vector search
│   └── firebase_handler.py # Firebase integration
├── data/
│   └── cbt_knowledge.docx  # CBT knowledge base
├── faiss_index/
│   ├── index.bin          # FAISS index
│   ├── id_map.json        # ID mappings
│   └── chunk_map.json     # Chunk texts
├── logs/
│   └── rag.log
├── requirements_rag.txt
└── firebase_credentials.json
```

## Monitoring & Logging

### Logs Location
`./logs/rag.log`

### Key Metrics to Monitor
1. **Retrieval Time**: Target < 100ms
2. **Relevance Scores**: Avg > 0.85
3. **Cache Hit Rate**: Track improvement over time
4. **System Health**: Document processing time

### Firebase Monitoring
- Query `retrieval_metrics` collection for performance
- Monitor `chat_logs` for usage patterns
- Track cache effectiveness

## Troubleshooting

### Issue: "FAISS index is empty"
```bash
# Rebuild index
FORCE_REBUILD=true python rag/app.py
```

### Issue: "OpenAI API error"
- Verify `OPENAI_API_KEY` is set
- Check API quota and rate limits
- Ensure model `text-embedding-3-small` is available

### Issue: "Firebase authentication failed"
- Verify credentials JSON path
- Check Firebase project ID
- Ensure service account has Firestore access

### Issue: "Slow retrieval"
- Check FAISS index size
- Verify network latency to Firebase
- Consider reducing `top_k`

## Best Practices

1. **Chunk Management**
   - Keep chunks 100-300 words
   - Overlap between chunks when needed
   - Maintain clear section hierarchy

2. **Embeddings**
   - Batch embed to save API calls
   - Cache embeddings locally (FAISS)
   - Monitor embedding dimension

3. **Retrieval**
   - Default `top_k=3` for most cases
   - Increase for more context
   - Monitor relevance scores

4. **Caching**
   - Enable for production
   - Monitor cache hit rates
   - Set appropriate TTL

5. **Logging**
   - Log all interactions (audit trail)
   - Track retrieval metrics
   - Monitor error rates

## Future Enhancements

- [ ] Hybrid search (keyword + semantic)
- [ ] Re-ranking with cross-encoder
- [ ] Multi-language support
- [ ] Streaming responses
- [ ] User feedback loop
- [ ] A/B testing framework
- [ ] Advanced analytics dashboard

## Performance Benchmarks

(Sample metrics from testing)

| Operation | Time | Notes |
|-----------|------|-------|
| Document Load | ~2s | For 50-page doc |
| Chunking | ~5s | ~1000 chunks |
| Embedding Gen | ~30s | API dependent |
| FAISS Search | ~5ms | Per query |
| GPT-4 Response | ~2s | Average |
| **Total E2E** | **~4.5s** | From query to response |

## Support & Documentation

- OpenAI API Docs: https://platform.openai.com/docs
- FAISS Docs: https://github.com/facebookresearch/faiss
- Firebase Docs: https://firebase.google.com/docs/firestore
- python-docx: https://python-docx.readthedocs.io

## License

Internal Use Only - Mental Health AI Project
