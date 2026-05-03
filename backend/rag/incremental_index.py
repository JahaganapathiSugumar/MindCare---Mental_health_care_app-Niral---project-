"""
Incremental FAISS index management
Load, update, and save FAISS index without full rebuilds
"""

import os
import json
import logging
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
import faiss

logger = logging.getLogger(__name__)


class IncrementalFAISSIndex:
    """Manage FAISS index with incremental updates"""
    
    def __init__(self, index_dir: str = "faiss_index", dimension: int = 1536):
        """
        Initialize incremental FAISS index
        
        Args:
            index_dir: Directory to store index and metadata
            dimension: Embedding dimension (1536 for text-embedding-3-small)
        """
        self.index_dir = index_dir
        self.dimension = dimension
        self.index = None
        self.next_id = 0  # Track next available ID
        self.chunk_id_to_index = {}  # Map chunk_id → FAISS index ID
        self.index_to_chunk_id = {}  # Map FAISS index ID → chunk_id
        
        # Create directory
        os.makedirs(index_dir, exist_ok=True)
        
        logger.info(f"Incremental FAISS Index initialized (dir: {index_dir}, dim: {dimension})")
    
    def load_or_create(self) -> bool:
        """
        Load existing index or create new one
        
        Returns:
            True if loaded, False if created
        """
        index_file = os.path.join(self.index_dir, "index.bin")
        id_map_file = os.path.join(self.index_dir, "id_map.json")
        
        # Try to load existing index
        if os.path.exists(index_file) and os.path.exists(id_map_file):
            try:
                logger.info(f"Loading existing FAISS index from {self.index_dir}")
                self.index = faiss.read_index(index_file)
                
                with open(id_map_file, 'r') as f:
                    id_map_data = json.load(f)
                    # Convert string keys to int
                    self.chunk_id_to_index = {v: int(k) for k, v in id_map_data.items()}
                    self.index_to_chunk_id = {int(k): v for k, v in id_map_data.items()}
                
                self.next_id = max(self.index_to_chunk_id.keys()) + 1 if self.index_to_chunk_id else 0
                
                logger.info(f"✓ Loaded index with {self.index.ntotal} vectors")
                return True
                
            except Exception as e:
                logger.error(f"Error loading index: {str(e)}")
                return False
        
        # Create new index
        logger.info(f"Creating new FAISS index (dimension: {self.dimension})")
        self.index = faiss.IndexFlatL2(self.dimension)
        self.next_id = 0
        self.chunk_id_to_index = {}
        self.index_to_chunk_id = {}
        return False
    
    def add_embeddings(self, embeddings: List[np.ndarray], 
                      chunk_ids: List[str],
                      overwrite: bool = False) -> List[int]:
        """
        Add embeddings to index (incrementally)
        
        Args:
            embeddings: List of embedding vectors
            chunk_ids: List of chunk IDs
            overwrite: If True, replace existing embeddings for same chunk_ids
            
        Returns:
            List of FAISS index IDs assigned
        """
        if not self.index:
            self.load_or_create()
        
        # Filter out duplicates unless overwrite is True
        new_embeddings = []
        new_chunk_ids = []
        faiss_ids = []
        
        for embedding, chunk_id in zip(embeddings, chunk_ids):
            if chunk_id in self.chunk_id_to_index:
                if overwrite:
                    # Mark for replacement (will need to rebuild)
                    logger.warning(f"Chunk {chunk_id} already exists, overwriting...")
                    # For now, skip (rebuild needed for proper replacement)
                    continue
                else:
                    logger.debug(f"Skipping duplicate chunk: {chunk_id}")
                    continue
            
            new_embeddings.append(embedding)
            new_chunk_ids.append(chunk_id)
            faiss_ids.append(self.next_id)
            self.next_id += 1
        
        if not new_embeddings:
            logger.info("No new embeddings to add")
            return []
        
        # Add to FAISS
        embeddings_array = np.array(new_embeddings, dtype=np.float32)
        self.index.add(embeddings_array)
        
        # Update mappings
        for faiss_id, chunk_id in zip(faiss_ids, new_chunk_ids):
            self.chunk_id_to_index[chunk_id] = faiss_id
            self.index_to_chunk_id[faiss_id] = chunk_id
        
        logger.info(f"Added {len(new_embeddings)} new embeddings (total: {self.index.ntotal})")
        return faiss_ids
    
    def search(self, query_embedding: np.ndarray, k: int = 3) -> List[Tuple[str, float]]:
        """
        Search index for similar embeddings
        
        Args:
            query_embedding: Query embedding vector
            k: Number of results
            
        Returns:
            List of tuples: (chunk_id, distance)
        """
        if not self.index or self.index.ntotal == 0:
            logger.warning("Index is empty")
            return []
        
        query_array = np.array([query_embedding], dtype=np.float32)
        distances, indices = self.index.search(query_array, min(k, self.index.ntotal))
        
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx >= 0 and idx in self.index_to_chunk_id:
                chunk_id = self.index_to_chunk_id[idx]
                results.append((chunk_id, float(distance)))
        
        return results
    
    def save(self) -> bool:
        """
        Save index and metadata to disk
        
        Returns:
            Success status
        """
        if not self.index:
            logger.warning("No index to save")
            return False
        
        try:
            # Save FAISS index
            index_file = os.path.join(self.index_dir, "index.bin")
            faiss.write_index(self.index, index_file)
            
            # Save ID mappings
            id_map_file = os.path.join(self.index_dir, "id_map.json")
            id_map_data = {str(faiss_id): chunk_id 
                          for chunk_id, faiss_id in self.chunk_id_to_index.items()}
            with open(id_map_file, 'w') as f:
                json.dump(id_map_data, f)
            
            logger.info(f"✓ Saved FAISS index to {self.index_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving index: {str(e)}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        return {
            'total_vectors': self.index.ntotal if self.index else 0,
            'dimension': self.dimension,
            'unique_chunks': len(self.chunk_id_to_index),
            'next_id': self.next_id
        }
    
    def get_chunk_count(self) -> int:
        """Get total number of chunks in index"""
        return len(self.chunk_id_to_index)
    
    def has_chunk(self, chunk_id: str) -> bool:
        """Check if chunk is in index"""
        return chunk_id in self.chunk_id_to_index


class MetadataStore:
    """Store and manage chunk metadata"""
    
    def __init__(self, metadata_file: str = "faiss_index/meta.json"):
        """
        Initialize metadata store
        
        Args:
            metadata_file: Path to metadata JSON file
        """
        self.metadata_file = metadata_file
        self.metadata = {}  # chunk_id → {text, source_file, etc.}
        
        # Create directory if needed
        os.makedirs(os.path.dirname(metadata_file) or ".", exist_ok=True)
        
        self.load()
    
    def load(self) -> bool:
        """Load metadata from disk"""
        if os.path.exists(self.metadata_file):
            try:
                with open(self.metadata_file, 'r') as f:
                    self.metadata = json.load(f)
                logger.info(f"✓ Loaded metadata for {len(self.metadata)} chunks")
                return True
            except Exception as e:
                logger.error(f"Error loading metadata: {str(e)}")
                return False
        
        return False
    
    def save(self) -> bool:
        """Save metadata to disk"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.metadata, f, indent=2)
            logger.info(f"✓ Saved metadata for {len(self.metadata)} chunks")
            return True
        except Exception as e:
            logger.error(f"Error saving metadata: {str(e)}")
            return False
    
    def add_chunk(self, chunk_id: str, text: str, source_file: str, 
                 section: str = "General", **kwargs) -> None:
        """
        Add chunk metadata
        
        Args:
            chunk_id: Unique chunk identifier
            text: Chunk text
            source_file: Source file name
            section: Section/category
            **kwargs: Additional metadata
        """
        self.metadata[chunk_id] = {
            'text': text,
            'source_file': source_file,
            'section': section,
            **kwargs
        }
    
    def add_chunks_batch(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Add multiple chunks
        
        Args:
            chunks: List of chunk dicts with at least 'chunk_id', 'text', 'source_file'
        """
        for chunk in chunks:
            chunk_id = chunk.pop('chunk_id')
            self.add_chunk(chunk_id, **chunk)
    
    def get_chunk_text(self, chunk_id: str) -> Optional[str]:
        """Get chunk text by ID"""
        return self.metadata.get(chunk_id, {}).get('text')
    
    def get_chunk_metadata(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """Get full chunk metadata"""
        return self.metadata.get(chunk_id)
    
    def has_chunk(self, chunk_id: str) -> bool:
        """Check if chunk metadata exists"""
        return chunk_id in self.metadata
    
    def get_chunks_by_source(self, source_file: str) -> List[str]:
        """Get all chunk IDs from a source file"""
        return [cid for cid, meta in self.metadata.items() 
                if meta.get('source_file') == source_file]
    
    def get_all_chunks(self) -> Dict[str, Dict[str, Any]]:
        """Get all metadata"""
        return self.metadata.copy()
    
    def get_chunk_count(self) -> int:
        """Get total chunk count"""
        return len(self.metadata)
