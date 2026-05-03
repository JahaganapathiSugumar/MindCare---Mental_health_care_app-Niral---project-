"""
RAG System Initialization Script
Demonstrates how to set up and test the RAG system
"""

import os
import sys
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_prerequisites():
    """Check if all prerequisites are met"""
    logger.info("Checking prerequisites...")
    
    checks = {
        'Python 3.10+': sys.version_info >= (3, 10),
        'OPENAI_API_KEY': 'OPENAI_API_KEY' in os.environ,
        'CBT Knowledge File': Path('data/cbt_knowledge.docx').exists(),
        'Firebase Credentials': Path('firebase_credentials.json').exists(),
    }
    
    all_ok = True
    for check, result in checks.items():
        status = "✓" if result else "✗"
        logger.info(f"{status} {check}")
        if not result:
            all_ok = False
    
    return all_ok


def setup_environment():
    """Setup environment variables"""
    logger.info("Setting up environment...")
    
    env_vars = {
        'MIN_CHUNK_SIZE': '100',
        'MAX_CHUNK_SIZE': '300',
        'RETRIEVAL_TOP_K': '3',
        'ENABLE_CACHE': 'true',
        'API_PORT': '5000',
        'DEBUG': 'false',
    }
    
    for key, default_value in env_vars.items():
        if key not in os.environ:
            os.environ[key] = default_value
            logger.info(f"Set {key}={default_value}")


def test_components():
    """Test individual RAG components"""
    logger.info("\n" + "="*50)
    logger.info("Testing RAG Components")
    logger.info("="*50)
    
    try:
        # Test imports
        logger.info("\n1. Testing imports...")
        from rag.docx_loader import CBTDocxLoader
        from rag.chunking import TextChunker
        from rag.embeddings import EmbeddingGenerator
        from rag.faiss_store import FAISSStore, RAGRetriever
        from rag.firebase_handler import FirebaseRAGHandler
        logger.info("✓ All imports successful")
        
        # Test document loading
        logger.info("\n2. Testing document loading...")
        loader = CBTDocxLoader('data/cbt_knowledge.docx')
        docs = loader.load_document()
        logger.info(f"✓ Loaded {len(docs)} sections")
        
        # Test chunking
        logger.info("\n3. Testing text chunking...")
        raw_text = loader.get_raw_text()
        chunker = TextChunker()
        chunks = chunker.chunk_by_sentences(raw_text, min_size=100, max_size=300)
        logger.info(f"✓ Created {len(chunks)} chunks")
        
        # Test embeddings
        logger.info("\n4. Testing embedding generation...")
        emb_gen = EmbeddingGenerator()
        test_embedding = emb_gen.embed_text("Test sentence for embedding")
        logger.info(f"✓ Generated embedding (dimension: {len(test_embedding)})")
        
        # Test FAISS
        logger.info("\n5. Testing FAISS setup...")
        faiss_store = FAISSStore(dimension=len(test_embedding))
        logger.info(f"✓ FAISS store created (dimension: {len(test_embedding)})")
        
        # Test Firebase
        logger.info("\n6. Testing Firebase connection...")
        firebase = FirebaseRAGHandler()
        logger.info("✓ Firebase connected")
        
        logger.info("\n" + "="*50)
        logger.info("✅ All component tests passed!")
        logger.info("="*50)
        return True
        
    except Exception as e:
        logger.error(f"❌ Component test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def initialize_rag():
    """Full RAG system initialization"""
    logger.info("\n" + "="*50)
    logger.info("Initializing RAG System")
    logger.info("="*50)
    
    try:
        from rag.app import initialize_rag_system
        
        cbt_file = os.getenv('CBT_KNOWLEDGE_FILE', 'data/cbt_knowledge.docx')
        success = initialize_rag_system(cbt_file, force_rebuild=True)
        
        if success:
            logger.info("\n✅ RAG system initialized successfully!")
            return True
        else:
            logger.error("❌ RAG system initialization failed")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error during RAG initialization: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_api():
    """Test API endpoints"""
    logger.info("\n" + "="*50)
    logger.info("Testing API Endpoints")
    logger.info("="*50)
    
    try:
        import requests
        import json
        
        base_url = "http://localhost:5000"
        
        # Test health check
        logger.info("\n1. Testing /health endpoint...")
        response = requests.get(f"{base_url}/health")
        logger.info(f"Status: {response.status_code}")
        logger.info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        # Test retrieve
        logger.info("\n2. Testing /retrieve endpoint...")
        data = {
            "query": "How do I manage anxiety?",
            "top_k": 3
        }
        response = requests.post(f"{base_url}/retrieve", json=data)
        logger.info(f"Status: {response.status_code}")
        result = response.json()
        logger.info(f"Found {len(result.get('results', []))} results")
        
        # Test chat
        logger.info("\n3. Testing /chat endpoint...")
        data = {
            "message": "I'm feeling anxious about work",
            "user_id": "test_user",
            "top_k": 3,
            "use_cache": False
        }
        response = requests.post(f"{base_url}/chat", json=data)
        logger.info(f"Status: {response.status_code}")
        result = response.json()
        if response.status_code == 200:
            logger.info(f"Response length: {len(result.get('response', ''))}")
            logger.info(f"Context used: {result.get('context_used', [])}")
        
        # Test stats
        logger.info("\n4. Testing /stats endpoint...")
        response = requests.get(f"{base_url}/stats")
        logger.info(f"Status: {response.status_code}")
        logger.info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        logger.info("\n✅ API tests completed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ API test failed: {str(e)}")
        logger.info("Make sure the Flask server is running on port 5000")
        return False


def main():
    """Main initialization workflow"""
    logger.info("\n" + "="*60)
    logger.info("RAG SYSTEM INITIALIZATION")
    logger.info("="*60)
    
    # Step 1: Check prerequisites
    if not check_prerequisites():
        logger.error("❌ Prerequisites not met. Please check the requirements.")
        return False
    
    # Step 2: Setup environment
    setup_environment()
    
    # Step 3: Test components
    if not test_components():
        logger.error("❌ Component tests failed.")
        return False
    
    # Step 4: Initialize RAG
    if not initialize_rag():
        logger.error("❌ RAG initialization failed.")
        return False
    
    logger.info("\n" + "="*60)
    logger.info("✅ INITIALIZATION COMPLETE!")
    logger.info("="*60)
    logger.info("\nNext steps:")
    logger.info("1. Start the Flask API: python rag/app.py")
    logger.info("2. Test endpoints: python rag/test_initialization.py (with server running)")
    logger.info("3. Check logs: tail -f logs/rag.log")
    logger.info("\nAPI will be available at: http://localhost:5000")
    
    return True


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
