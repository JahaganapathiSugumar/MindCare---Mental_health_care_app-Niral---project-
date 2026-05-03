"""
Flask API for RAG-powered mental health chatbot
"""

import os
import logging
import hashlib
import time
from typing import Dict, Any, List
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import requests

# RAG components
from rag.docx_loader import load_cbt_knowledge
from rag.chunking import chunk_cbt_knowledge
from rag.embeddings import embed_cbt_chunks, EmbeddingGenerator
from rag.faiss_store import FAISSStore, RAGRetriever as FAISSRetriever
from rag.firebase_handler import FirebaseRAGHandler
from rag.retriever import RAGRetriever, get_retriever

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global RAG components
retriever = None
firebase_handler = None
embedding_generator = None


# ===== LLM CLIENT (Grok) =====

def call_grok(system_prompt: str, user_prompt: str, max_tokens: int = 500, temperature: float = 0.7) -> str:
    """
    Call Grok API for chat completion
    
    Args:
        system_prompt: System prompt for the model
        user_prompt: User message
        max_tokens: Maximum tokens in response
        temperature: Temperature for response generation
        
    Returns:
        Generated response text
    """
    grok_api_key = os.getenv('GROK_API_KEY')
    if not grok_api_key:
        raise ValueError("GROK_API_KEY environment variable not set")
    
    try:
        # Using xAI's Grok API endpoint
        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {grok_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "grok-2-latest",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": max_tokens,
                "temperature": temperature
            }
        )
        
        if response.status_code != 200:
            logger.error(f"Grok API error: {response.status_code} - {response.text}")
            raise Exception(f"Grok API returned {response.status_code}")
        
        result = response.json()
        return result['choices'][0]['message']['content']
        
    except Exception as e:
        logger.error(f"Error calling Grok: {str(e)}")
        raise


# ===== INITIALIZATION =====

def initialize_rag_system(cbt_file_path: str, force_rebuild: bool = False) -> bool:
    """
    Initialize RAG system: load docs, create chunks, embeddings, and FAISS index
    
    Args:
        cbt_file_path: Path to CBT knowledge .docx file
        force_rebuild: Force rebuild of FAISS index
        
    Returns:
        Success status
    """
    global retriever, firebase_handler, embedding_generator
    
    try:
        logger.info("Initializing RAG system...")
        
        # Initialize Firebase
        firebase_handler = FirebaseRAGHandler()
        logger.info("✓ Firebase initialized")
        
        # Initialize embedding generator (local model, no API needed)
        embedding_generator = EmbeddingGenerator()
        embedding_dim = embedding_generator.get_embedding_dimension()
        logger.info(f"✓ Embedding generator initialized (dim: {embedding_dim})")
        
        # Initialize FAISS store
        faiss_store = FAISSStore(embedding_dim, index_path="faiss_index")
        
        # Check if index exists and is valid
        index_exists = os.path.exists("faiss_index/index.bin")
        
        if not force_rebuild and index_exists:
            logger.info("Loading existing FAISS index...")
            if faiss_store.load():
                retriever = RAGRetriever(faiss_store)
                logger.info("✓ RAG system loaded from disk")
                return True
        
        # Build new index
        logger.info("Building new FAISS index from CBT knowledge...")
        
        # Step 1: Load documents
        logger.info(f"Loading CBT knowledge from: {cbt_file_path}")
        paragraphs = load_cbt_knowledge(cbt_file_path)
        logger.info(f"✓ Loaded {len(paragraphs)} paragraphs")
        
        # Step 2: Chunk text
        chunks = chunk_cbt_knowledge(paragraphs, min_size=100, max_size=300)
        logger.info(f"✓ Created {len(chunks)} chunks")
        
        # Step 3: Generate embeddings (local, no API)
        embedding_result = embed_cbt_chunks(chunks)
        embeddings = embedding_result['embeddings']
        chunk_ids = embedding_result['chunk_ids']
        chunk_texts = embedding_result['texts']
        metadata = embedding_result['metadata']
        logger.info(f"✓ Generated {len(embeddings)} embeddings")
        
        # Step 4: Add to FAISS
        faiss_store.add_embeddings(embeddings, chunk_ids, chunk_texts, metadata)
        logger.info(f"✓ Added to FAISS index ({faiss_store.get_stats()})")
        
        # Step 5: Save index
        faiss_store.save()
        logger.info("✓ Saved FAISS index to disk")
        
        # Step 6: Store in Firebase
        chunks_data = [
            {
                'chunk_id': chunk_ids[i],
                'text': chunk_texts[i],
                'section': metadata[i].get('section', 'General'),
                'original_index': metadata[i].get('original_index', -1),
                'word_count': metadata[i].get('word_count', 0)
            }
            for i in range(len(chunks))
        ]
        firebase_handler.store_chunk_texts(chunks_data)
        logger.info("✓ Stored chunk metadata in Firebase")
        
        # Initialize retriever
        retriever = RAGRetriever(faiss_store)
        
        logger.info("✅ RAG system initialized successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error initializing RAG system: {str(e)}")
        return False


# ===== API ENDPOINTS =====

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'rag_initialized': retriever is not None
    })


@app.route('/chat', methods=['POST'])
def chat():
    """
    Main chat endpoint with RAG
    
    Request body:
    {
        "message": "user message",
        "user_id": "user123",
        "top_k": 3,  # optional
        "use_cache": true  # optional
    }
    
    Response:
    {
        "response": "AI response",
        "context_used": ["chunk_id_1", "chunk_id_2"],
        "relevance_scores": [0.95, 0.87],
        "model": "gpt-4",
        "timestamp": "2024-01-01T00:00:00"
    }
    """
    try:
        data = request.json
        user_message = data.get('message', '').strip()
        user_id = data.get('user_id', 'anonymous')
        top_k = data.get('top_k', 3)
        use_cache = data.get('use_cache', True)
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        start_time = time.time()
        
        # Get retriever
        retriever = get_retriever()
        
        if not retriever.is_index_ready():
            logger.warning("FAISS index is not ready. Using retriever without context.")
            # Generate response without context
            ai_response = _generate_response(user_message, [])
            context_ids = []
            retrieval_results = []
            retrieval_time = 0
        else:
            # Step 1: Check cache (optional)
            query_hash = hashlib.md5(user_message.encode()).hexdigest()
            cached = None
            if use_cache and firebase_handler:
                cached = firebase_handler.get_cached_response(query_hash)
                if cached:
                    logger.info(f"Cache hit for query: {query_hash}")
                    return jsonify({
                        'response': cached['response'],
                        'context_used': cached['context_used'],
                        'from_cache': True,
                        'cache_hits': cached.get('hit_count', 1)
                    })
            
            # Step 2: Retrieve context from FAISS
            retrieval_start = time.time()
            retrieval_results = retriever.retrieve(user_message, top_k)
            retrieval_time = time.time() - retrieval_start
            
            if not retrieval_results:
                logger.warning(f"No results found for query: {user_message}")
                # Generate response without context
                ai_response = _generate_response(user_message, [])
                context_ids = []
            else:
                # Step 3: Build context from retrieved chunks
                context_texts = [r['text'] for r in retrieval_results]
                relevance_scores = [r['relevance_score'] for r in retrieval_results]
                
                logger.info(f"Retrieved {len(retrieval_results)} relevant chunks")
                logger.info(f"Avg relevance: {np.mean(relevance_scores):.3f}")
                
                # Step 4: Generate AI response
                ai_response = _generate_response(user_message, context_texts)
                context_ids = [r['chunk_id'] for r in retrieval_results]
        
        # Step 5: Log interaction
        if firebase_handler:
            firebase_handler.log_chat_interaction(
                user_id=user_id,
                message=user_message,
                response=ai_response,
                context_used=context_ids
            )
        
        # Step 6: Cache response
        if retrieval_results and firebase_handler:
            query_hash = hashlib.md5(user_message.encode()).hexdigest()
            firebase_handler.cache_response(query_hash, ai_response, context_ids)
        
        # Log metrics
        if retrieval_results and firebase_handler:
            firebase_handler.log_retrieval_metrics(
                query=user_message,
                results_count=len(retrieval_results),
                avg_relevance=np.mean([r['relevance_score'] for r in retrieval_results]),
                retrieval_time_ms=retrieval_time * 1000
            )
        
        total_time = time.time() - start_time
        
        return jsonify({
            'response': ai_response,
            'context_used': [r['chunk_id'] for r in retrieval_results],
            'relevance_scores': [r['relevance_score'] for r in retrieval_results],
            'sections_used': [r['section'] for r in retrieval_results],
            'sources': [r['source_file'] for r in retrieval_results],
            'model': 'gpt-4',
            'retrieval_time_ms': retrieval_time * 1000,
            'total_time_ms': total_time * 1000,
            'from_cache': False
        })
        
    except Exception as e:
        logger.error(f"Error in /chat endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/retrieve', methods=['POST'])
def retrieve_context():
    """
    Retrieve context for a query without generating AI response
    
    Request body:
    {
        "query": "user query",
        "top_k": 3
    }
    """
    try:
        data = request.json
        query = data.get('query', '').strip()
        top_k = data.get('top_k', 3)
        
        if not query:
            return jsonify({'error': 'Query cannot be empty'}), 400
        
        if not retriever:
            return jsonify({'error': 'RAG system not initialized'}), 503
        
        # Generate embedding and retrieve
        query_embedding = embedding_generator.embed_text(query)
        results = retriever.retrieve(query_embedding, top_k)
        
        return jsonify({
            'query': query,
            'results': [
                {
                    'chunk_id': r['chunk_id'],
                    'text': r['text'],
                    'relevance_score': r['relevance_score'],
                    'section': r['section']
                }
                for r in results
            ]
        })
        
    except Exception as e:
        logger.error(f"Error in /retrieve endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/stats', methods=['GET'])
def get_stats():
    """Get RAG system statistics"""
    try:
        if not retriever:
            return jsonify({'error': 'RAG system not initialized'}), 503
        
        faiss_stats = retriever.store.get_stats()
        firebase_stats = firebase_handler.get_stats()
        
        return jsonify({
            'faiss': faiss_stats,
            'firebase': firebase_stats,
            'timestamp': time.time()
        })
        
    except Exception as e:
        logger.error(f"Error in /stats endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/history/<user_id>', methods=['GET'])
def get_chat_history(user_id):
    """Get user chat history"""
    try:
        limit = request.args.get('limit', 10, type=int)
        history = firebase_handler.get_user_chat_history(user_id, limit)
        
        return jsonify({
            'user_id': user_id,
            'history': history,
            'count': len(history)
        })
        
    except Exception as e:
        logger.error(f"Error in /history endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ===== HELPER FUNCTIONS =====

def _generate_response(user_message: str, context_texts: List[str]) -> str:
    """
    Generate AI response using Grok with CBT context
    
    Args:
        user_message: User's message
        context_texts: Retrieved context chunks
        
    Returns:
        Generated response
    """
    context_str = ""
    if context_texts:
        context_str = "\n\n---\n\n".join(context_texts)
        context_section = f"CBT-based guidance:\n\n{context_str}\n\n---\n\n"
    else:
        context_section = ""
    
    system_prompt = """You are a supportive and empathetic mental health assistant trained in Cognitive Behavioral Therapy (CBT) principles. 

Your role is to:
1. Listen empathetically to the user's concerns
2. Provide evidence-based CBT guidance and techniques
3. Help users understand thought-behavior patterns
4. Offer practical coping strategies
5. Encourage professional help when needed

Always be supportive, non-judgmental, and clear in your responses."""
    
    user_prompt = f"""{context_section}User: {user_message}

Please provide a thoughtful, empathetic response that incorporates CBT principles where appropriate."""
    
    try:
        return call_grok(system_prompt, user_prompt, max_tokens=500, temperature=0.7)
        
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        return "I apologize, but I'm having difficulty generating a response. Please try again later."


# ===== STARTUP =====

@app.before_request
def startup():
    """Initialize on first request"""
    global retriever
    if retriever is None:
        cbt_file = os.getenv('CBT_KNOWLEDGE_FILE', 'data/cbt_knowledge.docx')
        initialize_rag_system(cbt_file)


if __name__ == '__main__':
    # Initialize RAG system
    cbt_file = os.getenv('CBT_KNOWLEDGE_FILE', 'data/cbt_knowledge.docx')
    initialize_rag_system(cbt_file)
    
    # Run Flask app
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Flask app on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
