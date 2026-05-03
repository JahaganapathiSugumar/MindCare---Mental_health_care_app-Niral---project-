"""
Firebase Firestore handler for metadata and logging
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
from functools import lru_cache

logger = logging.getLogger(__name__)


class FirebaseRAGHandler:
    """Firebase Firestore integration for RAG system"""
    
    def __init__(self, credentials_path: str = None):
        """
        Initialize Firebase handler
        
        Args:
            credentials_path: Path to Firebase service account JSON
        """
        self.db = None
        self.initialized = False
        
        if not firebase_admin._apps:
            if credentials_path:
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()
            
            self.db = firestore.client()
            self.initialized = True
            logger.info("Firebase Firestore initialized")
        else:
            self.db = firestore.client()
            logger.info("Using existing Firebase app")
    
    # ===== CBT CHUNKS METADATA =====
    
    def store_chunk_metadata(self, chunk_id: str, metadata: Dict[str, Any]) -> bool:
        """
        Store chunk metadata in Firestore
        
        Args:
            chunk_id: Unique chunk identifier
            metadata: Chunk metadata dict
            
        Returns:
            Success status
        """
        try:
            doc_data = {
                'chunk_id': chunk_id,
                'section': metadata.get('section', 'General'),
                'original_index': metadata.get('original_index', -1),
                'word_count': metadata.get('word_count', 0),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            self.db.collection('cbt_chunks').document(chunk_id).set(doc_data)
            logger.info(f"Stored metadata for chunk: {chunk_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing chunk metadata: {str(e)}")
            return False
    
    def store_chunk_texts(self, chunks_data: List[Dict[str, Any]]) -> bool:
        """
        Batch store chunk metadata
        
        Args:
            chunks_data: List of chunk metadata dicts
            
        Returns:
            Success status
        """
        try:
            batch = self.db.batch()
            
            for chunk in chunks_data:
                doc_ref = self.db.collection('cbt_chunks').document(chunk['chunk_id'])
                doc_data = {
                    'chunk_id': chunk['chunk_id'],
                    'text': chunk.get('text', ''),
                    'section': chunk.get('section', 'General'),
                    'original_index': chunk.get('original_index', -1),
                    'word_count': chunk.get('word_count', 0),
                    'created_at': datetime.utcnow()
                }
                batch.set(doc_ref, doc_data)
            
            batch.commit()
            logger.info(f"Batch stored {len(chunks_data)} chunks")
            return True
            
        except Exception as e:
            logger.error(f"Error batch storing chunks: {str(e)}")
            return False
    
    def get_chunk_metadata(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve chunk metadata
        
        Args:
            chunk_id: Chunk identifier
            
        Returns:
            Metadata dict or None
        """
        try:
            doc = self.db.collection('cbt_chunks').document(chunk_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving chunk metadata: {str(e)}")
            return None
    
    # ===== CHAT LOGS =====
    
    def log_chat_interaction(self, user_id: str, 
                            message: str, 
                            response: str,
                            context_used: List[str],
                            model: str = "gpt-4") -> bool:
        """
        Log chat interaction for audit trail
        
        Args:
            user_id: User ID
            message: User message
            response: AI response
            context_used: List of chunk IDs used for context
            model: Model used
            
        Returns:
            Success status
        """
        try:
            log_entry = {
                'user_id': user_id,
                'message': message,
                'response': response,
                'context_used': context_used,
                'model': model,
                'timestamp': datetime.utcnow(),
                'message_length': len(message),
                'response_length': len(response),
                'context_count': len(context_used)
            }
            
            # Add to chat_logs collection
            self.db.collection('chat_logs').add(log_entry)
            
            # Also add to user's chat history
            self.db.collection('users').document(user_id).collection('chat_history').add(log_entry)
            
            logger.info(f"Logged chat interaction for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error logging chat: {str(e)}")
            return False
    
    def get_user_chat_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieve user chat history
        
        Args:
            user_id: User ID
            limit: Number of recent chats to retrieve
            
        Returns:
            List of chat logs
        """
        try:
            docs = (self.db.collection('users')
                   .document(user_id)
                   .collection('chat_history')
                   .order_by('timestamp', direction=firestore.Query.DESCENDING)
                   .limit(limit)
                   .stream())
            
            return [doc.to_dict() for doc in docs]
            
        except Exception as e:
            logger.error(f"Error retrieving chat history: {str(e)}")
            return []
    
    # ===== CACHED RESPONSES (OPTIONAL) =====
    
    def cache_response(self, query_hash: str, response: str, 
                      context_used: List[str], ttl_hours: int = 24) -> bool:
        """
        Cache AI response for frequently asked queries
        
        Args:
            query_hash: Hash of the query
            response: Generated response
            context_used: Chunks used for context
            ttl_hours: Time to live in hours
            
        Returns:
            Success status
        """
        try:
            cache_entry = {
                'query_hash': query_hash,
                'response': response,
                'context_used': context_used,
                'created_at': datetime.utcnow(),
                'ttl_hours': ttl_hours,
                'hit_count': 0
            }
            
            self.db.collection('response_cache').document(query_hash).set(cache_entry)
            logger.info(f"Cached response for query: {query_hash}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching response: {str(e)}")
            return False
    
    def get_cached_response(self, query_hash: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached response
        
        Args:
            query_hash: Hash of the query
            
        Returns:
            Cached response or None
        """
        try:
            doc = self.db.collection('response_cache').document(query_hash).get()
            
            if doc.exists:
                data = doc.to_dict()
                # Update hit count
                data['hit_count'] = data.get('hit_count', 0) + 1
                self.db.collection('response_cache').document(query_hash).update({
                    'hit_count': data['hit_count']
                })
                return data
            
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving cached response: {str(e)}")
            return None
    
    # ===== STATISTICS & MONITORING =====
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics"""
        try:
            chunks_count = self.db.collection('cbt_chunks').count().get()[0][0].value
            logs_count = self.db.collection('chat_logs').count().get()[0][0].value
            cache_count = self.db.collection('response_cache').count().get()[0][0].value
            
            return {
                'total_chunks': chunks_count,
                'total_logs': logs_count,
                'cache_entries': cache_count,
                'timestamp': datetime.utcnow()
            }
            
        except Exception as e:
            logger.error(f"Error getting stats: {str(e)}")
            return {}
    
    def log_retrieval_metrics(self, query: str, results_count: int, 
                             avg_relevance: float, retrieval_time_ms: float) -> bool:
        """
        Log retrieval performance metrics
        
        Args:
            query: Query text
            results_count: Number of results retrieved
            avg_relevance: Average relevance score
            retrieval_time_ms: Retrieval time in milliseconds
            
        Returns:
            Success status
        """
        try:
            metric = {
                'query': query,
                'results_count': results_count,
                'avg_relevance': avg_relevance,
                'retrieval_time_ms': retrieval_time_ms,
                'timestamp': datetime.utcnow()
            }
            
            self.db.collection('retrieval_metrics').add(metric)
            return True
            
        except Exception as e:
            logger.error(f"Error logging metrics: {str(e)}")
            return False
