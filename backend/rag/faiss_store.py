"""
FAISS vector store for fast similarity search
"""

import os
import json
import logging
from typing import List, Tuple, Dict, Any
import numpy as np
import faiss

logger = logging.getLogger(__name__)


class FAISSStore:
    """FAISS-based vector store for embedding similarity search"""
    
    def __init__(self, dimension: int, index_path: str = "faiss_index"):
        """
        Initialize FAISS store
        
        Args:
            dimension: Embedding dimension
            index_path: Directory to store index and metadata
        """
        self.dimension = dimension
        self.index_path = index_path
        self.index = None
        self.id_map = {}  # Maps FAISS ID to chunk_id
        self.chunk_map = {}  # Maps chunk_id to text
        self.metadata = {}  # Maps chunk_id to metadata
        
        # Create index directory
        os.makedirs(index_path, exist_ok=True)
        logger.info(f"FAISS store initialized with dimension: {dimension}")
    
    def create_index(self):
        """Create FAISS index with flat L2 distance"""
        self.index = faiss.IndexFlatL2(self.dimension)
        logger.info("Created FAISS index (Flat L2)")
    
    def add_embeddings(self, embeddings: List[np.ndarray], 
                      chunk_ids: List[str], 
                      chunk_texts: List[str],
                      metadata: List[Dict[str, Any]] = None):
        """
        Add embeddings to FAISS index
        
        Args:
            embeddings: List of embedding vectors
            chunk_ids: List of chunk IDs
            chunk_texts: List of chunk texts
            metadata: Optional list of metadata dicts
        """
        if not self.index:
            self.create_index()
        
        # Convert embeddings to proper format
        embeddings_array = np.array(embeddings, dtype=np.float32)
        
        # Get starting ID for new embeddings
        n_existing = self.index.ntotal
        
        # Add to FAISS
        self.index.add(embeddings_array)
        
        # Build ID maps
        for i, (chunk_id, text) in enumerate(zip(chunk_ids, chunk_texts)):
            faiss_id = n_existing + i
            self.id_map[faiss_id] = chunk_id
            self.chunk_map[chunk_id] = text
            
            if metadata:
                self.metadata[chunk_id] = metadata[i]
        
        logger.info(f"Added {len(embeddings)} embeddings to FAISS index")
    
    def search(self, query_embedding: np.ndarray, k: int = 3) -> List[Tuple[str, float, str]]:
        """
        Search for similar embeddings
        
        Args:
            query_embedding: Query embedding vector
            k: Number of results to return
            
        Returns:
            List of tuples: (chunk_id, distance, text)
        """
        if not self.index or self.index.ntotal == 0:
            logger.warning("FAISS index is empty")
            return []
        
        # Reshape query for FAISS
        query_array = np.array([query_embedding], dtype=np.float32)
        
        # Search
        distances, indices = self.index.search(query_array, k)
        
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx == -1:  # Invalid result
                continue
            
            chunk_id = self.id_map.get(idx)
            if chunk_id:
                text = self.chunk_map.get(chunk_id, "")
                results.append((chunk_id, float(distance), text))
        
        logger.info(f"Found {len(results)} results for query")
        return results
    
    def save(self):
        """Save index and metadata to disk"""
        if not self.index:
            logger.warning("No index to save")
            return
        
        try:
            # Save FAISS index
            index_file = os.path.join(self.index_path, "index.bin")
            faiss.write_index(self.index, index_file)
            
            # Save ID map
            id_map_file = os.path.join(self.index_path, "id_map.json")
            with open(id_map_file, 'w') as f:
                # Convert int keys to strings for JSON
                json_id_map = {str(k): v for k, v in self.id_map.items()}
                json.dump(json_id_map, f)
            
            # Save chunk map
            chunk_map_file = os.path.join(self.index_path, "chunk_map.json")
            with open(chunk_map_file, 'w') as f:
                json.dump(self.chunk_map, f)
            
            # Save metadata
            metadata_file = os.path.join(self.index_path, "metadata.json")
            with open(metadata_file, 'w') as f:
                json.dump(self.metadata, f)
            
            logger.info(f"Saved FAISS index to {self.index_path}")
            
        except Exception as e:
            logger.error(f"Error saving index: {str(e)}")
            raise
    
    def load(self):
        """Load index and metadata from disk"""
        try:
            # Load FAISS index
            index_file = os.path.join(self.index_path, "index.bin")
            if not os.path.exists(index_file):
                logger.warning(f"Index file not found: {index_file}")
                return False
            
            self.index = faiss.read_index(index_file)
            
            # Load ID map
            id_map_file = os.path.join(self.index_path, "id_map.json")
            with open(id_map_file, 'r') as f:
                json_id_map = json.load(f)
                # Convert string keys back to int
                self.id_map = {int(k): v for k, v in json_id_map.items()}
            
            # Load chunk map
            chunk_map_file = os.path.join(self.index_path, "chunk_map.json")
            with open(chunk_map_file, 'r') as f:
                self.chunk_map = json.load(f)
            
            # Load metadata
            metadata_file = os.path.join(self.index_path, "metadata.json")
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    self.metadata = json.load(f)
            
            logger.info(f"Loaded FAISS index from {self.index_path}")
            logger.info(f"Index contains {self.index.ntotal} vectors")
            return True
            
        except Exception as e:
            logger.error(f"Error loading index: {str(e)}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        return {
            'index_size': self.index.ntotal if self.index else 0,
            'dimension': self.dimension,
            'total_chunks': len(self.chunk_map),
            'total_metadata': len(self.metadata)
        }


class RAGRetriever:
    """High-level retriever using FAISS"""
    
    def __init__(self, faiss_store: FAISSStore):
        """Initialize retriever"""
        self.store = faiss_store
    
    def retrieve(self, query_embedding: np.ndarray, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieve relevant chunks for query
        
        Args:
            query_embedding: Query embedding
            top_k: Number of results
            
        Returns:
            List of dicts with chunk info and relevance score
        """
        results = self.store.search(query_embedding, top_k)
        
        retrieval_results = []
        for chunk_id, distance, text in results:
            relevance_score = 1.0 / (1.0 + distance)  # Convert distance to score
            
            meta = self.store.metadata.get(chunk_id, {})
            
            retrieval_results.append({
                'chunk_id': chunk_id,
                'text': text,
                'relevance_score': relevance_score,
                'distance': distance,
                'section': meta.get('section', 'General'),
                'original_index': meta.get('original_index', -1)
            })
        
        return retrieval_results
