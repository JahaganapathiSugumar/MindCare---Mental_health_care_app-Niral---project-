# Automated Incremental RAG Ingestion System

A production-ready system for continuously ingesting knowledge documents into a shared FAISS vector index without duplication.

## Overview

```
Data Folder (docx, pdf, txt)
    ↓
File Parser (Extract text)
    ↓
Text Chunker (100-300 words)
    ↓
Embedding Generator (OpenAI)
    ↓
Incremental FAISS Index (Add only new embeddings)
    ↓
Metadata Store (JSON)
    ↓
Retrieved by Chat API (Via Flask /chat endpoint)
```

## Key Features

✅ **Incremental Processing** - Skip already processed files  
✅ **Multiple Formats** - Support .docx, .pdf, .txt files  
✅ **No Duplication** - Track processed files with `processed_files.json`  
✅ **Fast Retrieval** - FAISS index (~5ms per query)  
✅ **Zero Rebuilds** - Existing FAISS index never rebuilt  
✅ **Automatic Metadata** - Chunk metadata persisted with source tracking  
✅ **Shared Knowledge Base** - All users access same knowledge  
✅ **Chat Integration** - Seamless /chat endpoint integration  

## System Components

### 1. **file_parsers.py** - Multi-Format Text Extraction

```python
from rag.file_parsers import get_universal_parser

parser = get_universal_parser()

# Supports .docx, .pdf, .txt
text = parser.extract_text("document.docx")
```

**Parsers:**
- **DocxParser** - Uses python-docx
- **PdfParser** - Uses pdfplumber or PyPDF2
- **TxtParser** - Native text reading

### 2. **incremental_index.py** - FAISS Index Management

```python
from rag.incremental_index import IncrementalFAISSIndex, MetadataStore

# Initialize (loads existing or creates new)
faiss_index = IncrementalFAISSIndex(index_dir="faiss_index")
faiss_index.load_or_create()

# Add embeddings (skips duplicates)
faiss_ids = faiss_index.add_embeddings(
    embeddings,
    chunk_ids,
    overwrite=False  # Don't replace existing
)

# Search
results = faiss_index.search(query_embedding, k=3)
# Returns: [(chunk_id, distance), ...]

# Save to disk
faiss_index.save()
```

### 3. **metadata_manager.py** - File Tracking & Stats

```python
from rag.metadata_manager import (
    ProcessedFilesTracker,
    IngestionMetadata,
    DataSourceManager
)

# Track processed files
tracker = ProcessedFilesTracker("processed_files.json")
if not tracker.is_processed("document.docx"):
    # Process file
    tracker.mark_processed("document.docx", chunks_count=50)
    tracker.save()

# Data source discovery
data_source = DataSourceManager("data_folder")
new_files = data_source.get_new_files(tracker)
```

### 4. **ingest.py** - Main Ingestion Pipeline

```python
from rag.ingest import RAGIngestionSystem

system = RAGIngestionSystem(
    data_folder="data_folder",
    faiss_index_dir="faiss_index"
)

# Ingest all new files
stats = system.ingest_all_new_files()
print(stats)
# {
#   'files_processed': 5,
#   'chunks_created': 250,
#   'duration': 45.3,
#   'status': 'success'
# }

# Test retrieval
context = system.retrieve_context("How to manage anxiety?", top_k=3)
```

### 5. **retriever.py** - Chat Integration

```python
from rag.retriever import get_retriever

retriever = get_retriever()

# Retrieve context
context = retriever.retrieve("user query", top_k=3)
# Returns: [
#   {
#     'chunk_id': 'file_0_abc123',
#     'text': 'Chunk text...',
#     'source_file': 'anxiety_guide.pdf',
#     'relevance_score': 0.95
#   },
#   ...
# ]

# Format for prompt
formatted = retriever.retrieve_and_format("user query", top_k=3)
```

## Installation

### 1. Install Dependencies

```bash
pip install -r requirements_rag.txt
```

**Key packages:**
- `python-docx` - Parse .docx files
- `pdfplumber` - Parse .pdf files (recommended)
- `PyPDF2` - Alternative PDF parser
- `openai` - Embeddings
- `faiss-cpu` - Vector search (use `faiss-gpu` for GPU)
- `firebase-admin` - Firebase integration

### 2. Create Data Folder

```bash
mkdir data_folder
# Add your .docx, .pdf, .txt files here
```

### 3. Configure Environment

```bash
export OPENAI_API_KEY="sk_test_..."
export FIREBASE_CREDENTIALS_PATH="./firebase_credentials.json"
```

## Usage

### Run Ingestion

```bash
# Process all new files in data_folder
python rag/ingest.py
```

**Output:**
```
==============================================================================
STARTING INCREMENTAL RAG INGESTION
==============================================================================

Found 3 new files to process:
  - anxiety_guide.pdf (2.5 MB)
  - cbt_techniques.docx (1.2 MB)
  - mindfulness.txt (45 KB)

============================================================
Processing: anxiety_guide.pdf
============================================================
Step 1: Extracting text...
✓ Extracted 125432 characters
Step 2: Chunking text...
✓ Created 85 chunks
Step 3: Generating embeddings...
✓ Generated 85 embeddings
Step 4: Updating FAISS index...
✓ Added 85 new embeddings to FAISS
Step 5: Storing metadata...
✓ Stored metadata for 85 chunks
Step 6: Saving to disk...
✓ Saved FAISS index and metadata

==============================================================================
INGESTION SUMMARY
==============================================================================
Duration: 145.23 seconds
Files processed: 3/3
Failed: 0
Total chunks created: 250
FAISS index size: 250
Metadata entries: 250
```

### View Statistics

```bash
python rag/ingest.py --stats
```

**Output:**
```
System Statistics:
{
  "faiss_index": {
    "total_vectors": 250,
    "dimension": 1536,
    "unique_chunks": 250,
    "next_id": 250
  },
  "metadata": {
    "chunk_count": 250
  },
  "processed_files": {
    "total_processed": 3,
    "successful": 3,
    "failed": 0,
    "total_chunks": 250,
    "avg_chunks_per_file": 83.33
  },
  "ingestion": {
    "last_ingestion": "2024-05-03T15:30:45.123456",
    "total_files_processed": 3,
    "total_chunks_created": 250,
    "total_runs": 1,
    "successful_runs": 1,
    "avg_chunks_per_run": 250
  }
}
```

### Test Retrieval

```bash
python rag/ingest.py --query "How do I manage anxiety?"
```

**Output:**
```
Retrieving context for: How do I manage anxiety?

Result 1:
  File: anxiety_guide.pdf
  Section: Coping Strategies
  Relevance: 97.5%
  Text: Anxiety management involves several key strategies...

Result 2:
  File: cbt_techniques.docx
  Section: Cognitive Restructuring
  Relevance: 92.3%
  Text: Cognitive restructuring helps identify unhelpful thoughts...
```

### Reset Processed Files (Reprocess All)

```bash
python rag/ingest.py --reset
```

This will reprocess all files on next run.

## File Structure

```
backend/
├── rag/
│   ├── ingest.py                 # Main ingestion script
│   ├── file_parsers.py           # Text extraction (docx, pdf, txt)
│   ├── incremental_index.py      # FAISS index management
│   ├── metadata_manager.py       # File tracking & stats
│   ├── retriever.py              # Chat integration
│   ├── app.py                    # Flask API (updated /chat)
│   ├── INGESTION_GUIDE.md        # This file
│   └── ...other modules...
│
├── data_folder/                  # Data source
│   ├── anxiety_guide.pdf
│   ├── cbt_techniques.docx
│   └── mindfulness.txt
│
├── faiss_index/                  # FAISS index (auto-created)
│   ├── index.bin                 # Vector index
│   ├── id_map.json               # ID mappings
│   └── meta.json                 # Chunk metadata
│
├── processed_files.json          # Tracking (auto-created)
├── ingestion_metadata.json       # Statistics (auto-created)
└── requirements_rag.txt          # Dependencies
```

## Data Flow

### Ingestion Flow

```
1. Scan data_folder/
2. Check processed_files.json
3. Find unprocessed files
4. For each new file:
   a. Parse text (docx/pdf/txt)
   b. Chunk text (100-300 words)
   c. Generate embeddings (OpenAI)
   d. Add to FAISS index
   e. Store metadata
   f. Save to disk
   g. Mark as processed
5. Record statistics
```

### Chat Flow

```
1. User sends message via /chat
2. Retriever gets FAISS index
3. Embed user query (OpenAI)
4. FAISS search (top-3 chunks)
5. Retrieve metadata for each chunk
6. Format context for LLM
7. Call GPT-4 with context
8. Log interaction (Firebase)
9. Cache response
10. Return to user
```

## Processed Files Tracking

### processed_files.json

```json
{
  "anxiety_guide.pdf": {
    "processed_at": "2024-05-03T15:30:45.123456",
    "status": "success",
    "chunks_count": 85
  },
  "cbt_techniques.docx": {
    "processed_at": "2024-05-03T15:31:22.456789",
    "status": "success",
    "chunks_count": 92
  },
  "mindfulness.txt": {
    "processed_at": "2024-05-03T15:32:01.789012",
    "status": "success",
    "chunks_count": 73
  }
}
```

## FAISS Index Metadata

### meta.json Structure

```json
{
  "anxiety_guide.pdf_0_chunk_abc123": {
    "text": "Anxiety is a common mental health condition...",
    "source_file": "anxiety_guide.pdf",
    "section": "Introduction",
    "word_count": 145,
    "chunk_index": 0
  },
  "anxiety_guide.pdf_1_chunk_def456": {
    "text": "Common symptoms include worry, tension...",
    "source_file": "anxiety_guide.pdf",
    "section": "Symptoms",
    "word_count": 156,
    "chunk_index": 1
  }
}
```

## Performance

### Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Parse 2.5MB PDF | ~3s | 85 chunks |
| Generate 85 embeddings | ~12s | OpenAI API |
| Add to FAISS | ~100ms | In-memory |
| Save to disk | ~50ms | JSON + binary |
| FAISS search | ~5ms | Per query |
| **Single file total** | ~15s | End-to-end |
| **3 files batch** | ~45s | Parallel embedding |

### Scaling

- **Index Size**: FAISS can handle millions of vectors
- **Chunk Metadata**: Stored efficiently in JSON
- **Memory**: ~1.5GB per 1M embeddings (1536-dim)
- **Disk Space**: ~6KB per chunk (text + metadata)

## Automation

### Cron Job (Linux/Mac)

```bash
# Run every day at 2 AM
0 2 * * * cd /path/to/backend && python rag/ingest.py >> logs/ingest.log 2>&1
```

### Python Scheduler

```python
from apscheduler.schedulers.background import BackgroundScheduler
from rag.ingest import RAGIngestionSystem

scheduler = BackgroundScheduler()
system = RAGIngestionSystem()

def scheduled_ingest():
    system.ingest_all_new_files()

scheduler.add_job(scheduled_ingest, 'interval', hours=1)
scheduler.start()
```

## API Integration

### Updated /chat Endpoint

The Flask `/chat` endpoint now:
1. Retrieves context via incremental FAISS index
2. Uses `retriever.retrieve()` for context lookup
3. Includes source files in response
4. Tracks retrieval performance

```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I manage anxiety?",
    "user_id": "user123",
    "top_k": 3
  }'
```

**Response:**
```json
{
  "response": "Anxiety management involves...",
  "context_used": ["anxiety_guide.pdf_0_chunk_abc123", "..."],
  "relevance_scores": [0.95, 0.87],
  "sources": ["anxiety_guide.pdf", "cbt_techniques.docx"],
  "retrieval_time_ms": 8.5,
  "total_time_ms": 2145.3
}
```

## Troubleshooting

### Issue: "FAISS index is empty"
```bash
# Run ingestion
python rag/ingest.py

# Check if files exist in data_folder/
ls -la data_folder/
```

### Issue: "No new files to process"
```bash
# Reset and reprocess
python rag/ingest.py --reset
```

### Issue: "OpenAI API error"
- Verify `OPENAI_API_KEY` is set
- Check API quota
- Ensure `text-embedding-3-small` is available

### Issue: "PDF parsing fails"
```bash
# Try PyPDF2 as fallback (pdfplumber is default)
# Modify file_parsers.py line ~80:
# parser = PdfParser(use_pdfplumber=False)
```

## Best Practices

1. **File Organization**
   - Use clear, descriptive file names
   - Organize by topic in subfolders

2. **Chunking**
   - Keep chunks 100-300 words
   - Chunks can overlap for better context

3. **Regular Ingestion**
   - Run ingest.py daily or weekly
   - Monitor ingestion_metadata.json

4. **Monitoring**
   - Check FAISS index size regularly
   - Monitor retrieval performance
   - Track cache hit rates

5. **Maintenance**
   - Backup faiss_index/ and *.json files
   - Test retrieval quality periodically
   - Update CBT knowledge regularly

## Advanced Topics

### Custom Chunking Strategy

```python
from rag.ingest import RAGIngestionSystem

system = RAGIngestionSystem()

# Override chunking
chunks = system.chunker.chunk_by_sentences(
    text,
    min_size=150,      # Larger chunks
    max_size=400,
    overlap_sentences=2
)
```

### Batch Processing

```python
# Process multiple batches
files = system.data_source.discover_files()
for batch in chunks(files, size=5):
    for file in batch:
        system.ingest_file(str(file))
```

### Custom Metadata

```python
# Add custom metadata
chunk_list_for_metadata = []
for chunk in chunks:
    chunk_list_for_metadata.append({
        'chunk_id': f"{file_name}_{i}",
        'text': chunk.text,
        'source_file': file_name,
        'section': chunk.section,
        'difficulty_level': 'beginner',  # Custom
        'tags': ['cbt', 'anxiety'],       # Custom
    })

metadata_store.add_chunks_batch(chunk_list_for_metadata)
```

## Summary

The incremental RAG ingestion system provides:

✅ **Automated workflow** - Continuous document ingestion  
✅ **Zero duplication** - Intelligent file tracking  
✅ **Fast retrieval** - FAISS-powered search (~5ms)  
✅ **Shared knowledge** - All users access same index  
✅ **Zero rebuilds** - Existing index never recreated  
✅ **Production-ready** - Error handling & logging  
✅ **Easy integration** - Seamless /chat endpoint  

**Status**: Ready for production deployment ✅
