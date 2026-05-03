"""
Embedding generation using SentenceTransformers (local model, no API needed)
"""

import logging
from typing import List, Dict, Any
import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingGenerator:
    """Generate embeddings using SentenceTransformer locally"""
    
    def __init__(self, model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize embedding generator with local SentenceTransformer model
        
        Args:
            model: Hugging Face model ID (default: all-MiniLM-L6-v2)
        """
        self.model = model
        self.embedding_dim = 384  # all-MiniLM-L6-v2 produces 384-dimensional embeddings
        
        logger.info(f"Loading SentenceTransformer model: {self.model}")
        self.transformer = SentenceTransformer(self.model)
        logger.info(f"✓ Model loaded (embedding dimension: {self.embedding_dim})")
    
    def embed_text(self, text: str) -> np.ndarray:
        """
        Generate embedding for single text
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding as numpy array
        """
        try:
            embedding = self.transformer.encode(text, convert_to_numpy=True)
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    def embed_texts(self, texts: List[str], batch_size: int = 32) -> List[np.ndarray]:
        """
        Generate embeddings for multiple texts
        
        Args:
            texts: List of texts to embed
            batch_size: Batch size for processing (default: 32)
            
        Returns:
            List of embeddings as numpy arrays
        """
        try:
            logger.info(f"Embedding {len(texts)} texts with batch size {batch_size}")
            embeddings = self.transformer.encode(texts, convert_to_numpy=True, batch_size=batch_size)
            logger.info(f"✓ Generated {len(embeddings)} embeddings")
            return [np.array(e) for e in embeddings]
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings from this model"""
        return self.embedding_dim


class ChunkEmbeddingPipeline:
    """Pipeline to embed chunks with metadata tracking"""
    
    def __init__(self):
        """Initialize pipeline"""
        self.generator = EmbeddingGenerator()
        self.embeddings_metadata = []
    
    def embed_chunks(self, chunks: List[Any]) -> Dict[str, Any]:
        """
        Embed chunks and maintain metadata mapping
        
        Args:
            chunks: List of Chunk objects from chunking.py
            
        Returns:
            Dict with:
                - embeddings: List of numpy arrays
                - chunk_ids: List of chunk IDs
                - metadata: List of metadata dicts
        """
        # Extract texts
        texts = [chunk.text for chunk in chunks]
        
        # Generate embeddings
        embeddings = self.generator.embed_texts(texts)
        
        # Create metadata mapping
        metadata = []
        for chunk, embedding in zip(chunks, embeddings):
            meta = {
                'chunk_id': chunk.chunk_id,
                'section': chunk.section,
                'original_index': chunk.original_index,
                'word_count': chunk.word_count,
                'embedding_dim': len(embedding)
            }
            metadata.append(meta)
        
        logger.info(f"Embedded {len(chunks)} chunks successfully")
        
        return {
            'embeddings': embeddings,
            'chunk_ids': [c.chunk_id for c in chunks],
            'metadata': metadata,
            'texts': texts
        }


def embed_cbt_chunks(chunks: List[Any]) -> Dict[str, Any]:
    """
    Convenience function to embed chunks
    
    Args:
        chunks: List of Chunk objects
        
    Returns:
        Dictionary with embeddings and metadata
    """
    pipeline = ChunkEmbeddingPipeline()
    return pipeline.embed_chunks(chunks)
