"""
Configuration for RAG system
"""

import os
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
FAISS_INDEX_DIR = PROJECT_ROOT / "faiss_index"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
FAISS_INDEX_DIR.mkdir(exist_ok=True)

# RAG Configuration
RAG_CONFIG = {
    # Chunking
    'min_chunk_size': int(os.getenv('MIN_CHUNK_SIZE', 100)),  # words
    'max_chunk_size': int(os.getenv('MAX_CHUNK_SIZE', 300)),  # words
    
    # Retrieval
    'retrieval_top_k': int(os.getenv('RETRIEVAL_TOP_K', 3)),
    'embedding_model': os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small'),
    
    # Caching
    'enable_cache': os.getenv('ENABLE_CACHE', 'true').lower() == 'true',
    'cache_ttl_hours': int(os.getenv('CACHE_TTL_HOURS', 24)),
    
    # FAISS
    'faiss_index_path': FAISS_INDEX_DIR,
    'faiss_index_type': os.getenv('FAISS_INDEX_TYPE', 'flat'),  # flat or hnsw
    
    # OpenAI
    'openai_api_key': os.getenv('OPENAI_API_KEY'),
    'gpt_model': os.getenv('GPT_MODEL', 'gpt-4'),
    'gpt_temperature': float(os.getenv('GPT_TEMPERATURE', 0.7)),
    'gpt_max_tokens': int(os.getenv('GPT_MAX_TOKENS', 500)),
    
    # Firebase
    'firebase_credentials': os.getenv('FIREBASE_CREDENTIALS_PATH', 
                                     PROJECT_ROOT / 'backend' / 'firebase_credentials.json'),
    
    # Data
    'cbt_knowledge_file': os.getenv('CBT_KNOWLEDGE_FILE', 
                                    DATA_DIR / 'cbt_knowledge.docx'),
    
    # Logging
    'log_level': os.getenv('LOG_LEVEL', 'INFO'),
    'log_file': PROJECT_ROOT / 'logs' / 'rag.log',
}

# API Configuration
API_CONFIG = {
    'host': os.getenv('API_HOST', '0.0.0.0'),
    'port': int(os.getenv('API_PORT', 5000)),
    'debug': os.getenv('DEBUG', 'False').lower() == 'true',
    'cors_origins': os.getenv('CORS_ORIGINS', '*'),
    'max_request_size': int(os.getenv('MAX_REQUEST_SIZE', 16 * 1024 * 1024)),  # 16MB
}

# Database Configuration
DB_CONFIG = {
    'firebase_project_id': os.getenv('FIREBASE_PROJECT_ID'),
    'firebase_private_key': os.getenv('FIREBASE_PRIVATE_KEY'),
    'firebase_client_email': os.getenv('FIREBASE_CLIENT_EMAIL'),
}

# Ensure logs directory
log_dir = RAG_CONFIG['log_file'].parent
log_dir.mkdir(exist_ok=True, parents=True)
