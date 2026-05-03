"""
Retrieval module for chat integration
Provides high-level retrieval interface for the chat API
"""

import logging
from typing import List, Dict, Any, Optional
import numpy as np

from rag.embeddings import EmbeddingGenerator
from rag.incremental_index import IncrementalFAISSIndex, MetadataStore

logger = logging.getLogger(__name__)


class RAGRetriever:
    """High-level retrieval interface for chat integration"""
    
    def __init__(self, 
                 faiss_index_dir: str = "faiss_index",
                 embedding_dimension: int = 384):
        """
        Initialize RAG retriever
        
        Args:
            faiss_index_dir: Directory containing FAISS index
            embedding_dimension: Embedding dimension (default: 384 for SentenceTransformer)
        """
        self.faiss_index = IncrementalFAISSIndex(
            index_dir=faiss_index_dir,
            dimension=embedding_dimension
        )
        
        self.metadata_store = MetadataStore(
            metadata_file=f"{faiss_index_dir}/meta.json"
        )
        
        self.embedding_gen = EmbeddingGenerator()
        
        # Try to load existing index
        self.index_loaded = self.faiss_index.load_or_create()
        
        if not self.index_loaded:
            logger.warning("FAISS index not found. Please run ingest.py first.")
        
        self.metadata_store.load()
        
        logger.info(f"RAG Retriever initialized")
        logger.info(f"  - Index size: {self.faiss_index.get_stats()['total_vectors']}")
        logger.info(f"  - Metadata entries: {self.metadata_store.get_chunk_count()}")
    
    def retrieve(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieve relevant context for a query
        
        Args:
            query: User query text
            top_k: Number of results to return
            
        Returns:
            List of relevant chunks with metadata and relevance scores
        """
        if self.faiss_index.get_chunk_count() == 0:
            logger.warning("FAISS index is empty")
            return []
        
        try:
            # Step 1: Generate query embedding
            logger.debug(f"Embedding query: {query[:100]}...")
            query_embedding = self.embedding_gen.embed_text(query)
            
            # Step 2: Search FAISS
            logger.debug(f"Searching FAISS index for top {top_k} results...")
            search_results = self.faiss_index.search(query_embedding, top_k)
            
            if not search_results:
                logger.info("No results found in FAISS index")
                return []
            
            # Step 3: Build context with metadata
            context = []
            for chunk_id, distance in search_results:
                metadata = self.metadata_store.get_chunk_metadata(chunk_id)
                
                if not metadata:
                    logger.warning(f"Metadata not found for chunk: {chunk_id}")
                    continue
                
                relevance_score = 1.0 / (1.0 + distance)
                
                context.append({
                    'chunk_id': chunk_id,
                    'text': metadata.get('text', ''),
                    'source_file': metadata.get('source_file', 'unknown'),
                    'section': metadata.get('section', 'General'),
                    'word_count': metadata.get('word_count', 0),
                    'distance': float(distance),
                    'relevance_score': float(relevance_score)
                })
            
            logger.info(f"Retrieved {len(context)} relevant chunks")
            return context
            
        except Exception as e:
            logger.error(f"Error during retrieval: {str(e)}")
            return []
    
    def retrieve_and_format(self, query: str, top_k: int = 3) -> str:
        """
        Retrieve context and format as a string for prompt injection
        
        Args:
            query: User query text
            top_k: Number of results
            
        Returns:
            Formatted context string for LLM prompt
        """
        results = self.retrieve(query, top_k)
        
        if not results:
            return "No relevant context found."
        
        # Format results
        formatted_parts = []
        for i, chunk in enumerate(results, 1):
            part = f"Source {i}: {chunk['source_file']} (Section: {chunk['section']}, Relevance: {chunk['relevance_score']:.1%})\n{chunk['text']}"
            formatted_parts.append(part)
        
        return "\n\n---\n\n".join(formatted_parts)
    
    def is_index_ready(self) -> bool:
        """Check if index is ready for retrieval"""
        return self.faiss_index.get_chunk_count() > 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get retriever statistics"""
        return {
            'index_size': self.faiss_index.get_stats()['total_vectors'],
            'unique_chunks': self.faiss_index.get_chunk_count(),
            'metadata_entries': self.metadata_store.get_chunk_count(),
            'is_ready': self.is_index_ready()
        }


# Global retriever instance
_retriever_instance = None


def get_retriever(faiss_index_dir: str = "faiss_index") -> RAGRetriever:
    """Get or create global retriever instance"""
    global _retriever_instance
    if _retriever_instance is None:
        _retriever_instance = RAGRetriever(faiss_index_dir=faiss_index_dir)
    return _retriever_instance


def retrieve_context(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """Convenience function to retrieve context"""
    retriever = get_retriever()
    return retriever.retrieve(query, top_k)


def retrieve_and_format(query: str, top_k: int = 3) -> str:
    """Convenience function to retrieve and format context"""
    retriever = get_retriever()
    return retriever.retrieve_and_format(query, top_k)
