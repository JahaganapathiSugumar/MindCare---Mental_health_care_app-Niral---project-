"""
Text chunking strategies for CBT knowledge processing
"""

import re
import logging
from typing import List, Dict, Any
from dataclasses import dataclass
import uuid

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """Represents a single text chunk with metadata"""
    chunk_id: str
    text: str
    section: str
    original_index: int
    word_count: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert chunk to dictionary"""
        return {
            'chunk_id': self.chunk_id,
            'text': self.text,
            'section': self.section,
            'original_index': self.original_index,
            'word_count': self.word_count,
        }


class TextChunker:
    """Split text into meaningful chunks for embedding"""
    
    def __init__(self, min_chunk_size: int = 100, max_chunk_size: int = 300):
        """
        Initialize chunker
        
        Args:
            min_chunk_size: Minimum words per chunk
            max_chunk_size: Maximum words per chunk
        """
        self.min_chunk_size = min_chunk_size
        self.max_chunk_size = max_chunk_size
    
    def count_words(self, text: str) -> int:
        """Count words in text"""
        return len(text.split())
    
    def clean_text(self, text: str) -> str:
        """
        Clean text: remove extra whitespace, normalize line breaks
        
        Args:
            text: Raw text to clean
            
        Returns:
            Cleaned text
        """
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove leading/trailing whitespace
        text = text.strip()
        return text
    
    def chunk_by_sentences(self, text: str, section: str = "General") -> List[Chunk]:
        """
        Split text by sentences and group into optimal size chunks
        
        Args:
            text: Text to chunk
            section: Section/topic name
            
        Returns:
            List of Chunk objects
        """
        text = self.clean_text(text)
        
        # Split by sentence endings
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        chunks = []
        current_chunk = []
        chunk_index = 0
        
        for sentence in sentences:
            current_chunk.append(sentence)
            chunk_text = ' '.join(current_chunk)
            word_count = self.count_words(chunk_text)
            
            # If chunk is at max size or this is last sentence
            if word_count >= self.max_chunk_size or sentence == sentences[-1]:
                if word_count >= self.min_chunk_size:
                    chunk = Chunk(
                        chunk_id=f"{section}_{chunk_index}_{uuid.uuid4().hex[:8]}",
                        text=chunk_text,
                        section=section,
                        original_index=chunk_index,
                        word_count=word_count
                    )
                    chunks.append(chunk)
                    current_chunk = []
                    chunk_index += 1
        
        logger.info(f"Created {len(chunks)} chunks from section: {section}")
        return chunks
    
    def chunk_by_paragraphs(self, paragraphs: List[tuple]) -> List[Chunk]:
        """
        Chunk text that's already split into (section, text) tuples
        
        Args:
            paragraphs: List of (section, text) tuples
            
        Returns:
            List of Chunk objects
        """
        all_chunks = []
        
        for section, text in paragraphs:
            chunks = self.chunk_by_sentences(text, section)
            all_chunks.extend(chunks)
        
        logger.info(f"Total chunks created: {len(all_chunks)}")
        return all_chunks
    
    def chunk_text(self, text: str, section: str = "General") -> List[Chunk]:
        """
        Main method to chunk text with intelligent sentence boundaries
        
        Args:
            text: Text to chunk
            section: Section name
            
        Returns:
            List of Chunk objects
        """
        return self.chunk_by_sentences(text, section)


def chunk_cbt_knowledge(paragraphs: List[tuple], 
                        min_size: int = 100, 
                        max_size: int = 300) -> List[Chunk]:
    """
    Convenience function to chunk CBT knowledge
    
    Args:
        paragraphs: List of (section, text) tuples from docx_loader
        min_size: Minimum chunk size in words
        max_size: Maximum chunk size in words
        
    Returns:
        List of Chunk objects ready for embedding
    """
    chunker = TextChunker(min_chunk_size=min_size, max_chunk_size=max_size)
    return chunker.chunk_by_paragraphs(paragraphs)
