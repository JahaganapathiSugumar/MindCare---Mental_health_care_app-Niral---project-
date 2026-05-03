"""
RAG System for Mental Health Chatbot
Retrieval-Augmented Generation with FAISS + Firebase + OpenAI
"""

__version__ = '1.0.0'
__author__ = 'Mental Health AI Team'

from rag.docx_loader import CBTDocxLoader, load_cbt_knowledge
from rag.chunking import TextChunker, Chunk, chunk_cbt_knowledge
from rag.embeddings import EmbeddingGenerator, ChunkEmbeddingPipeline, embed_cbt_chunks
from rag.faiss_store import FAISSStore, RAGRetriever
from rag.firebase_handler import FirebaseRAGHandler
from rag.file_parsers import UniversalFileParser, get_universal_parser, extract_text
from rag.incremental_index import IncrementalFAISSIndex, MetadataStore
from rag.metadata_manager import ProcessedFilesTracker, IngestionMetadata, DataSourceManager
from rag.retriever import RAGRetriever as IncrementalRAGRetriever, get_retriever
from rag.ingest import RAGIngestionSystem

__all__ = [
    'CBTDocxLoader',
    'load_cbt_knowledge',
    'TextChunker',
    'Chunk',
    'chunk_cbt_knowledge',
    'EmbeddingGenerator',
    'ChunkEmbeddingPipeline',
    'embed_cbt_chunks',
    'FAISSStore',
    'RAGRetriever',
    'FirebaseRAGHandler',
    'UniversalFileParser',
    'get_universal_parser',
    'extract_text',
    'IncrementalFAISSIndex',
    'MetadataStore',
    'ProcessedFilesTracker',
    'IngestionMetadata',
    'DataSourceManager',
    'IncrementalRAGRetriever',
    'get_retriever',
    'RAGIngestionSystem',
]
