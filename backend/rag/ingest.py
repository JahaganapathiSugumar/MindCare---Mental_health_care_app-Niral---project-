"""
Automated incremental RAG ingestion system
Continuously ingest files and update FAISS index without duplication
"""

import os
import sys
import time
import logging
from pathlib import Path
from typing import List, Dict, Tuple
import numpy as np

# Add backend directory to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Import RAG components
from rag.file_parsers import get_universal_parser
from rag.chunking import TextChunker, Chunk
from rag.embeddings import EmbeddingGenerator
from rag.incremental_index import IncrementalFAISSIndex, MetadataStore
from rag.metadata_manager import (
    ProcessedFilesTracker, 
    IngestionMetadata, 
    DataSourceManager
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RAGIngestionSystem:
    """Automated incremental RAG ingestion pipeline"""
    
    def __init__(self, 
                 data_folder: str = "backend\\data_folder",
                 faiss_index_dir: str = "faiss_index",
                 embedding_dimension: int = 384):
        """
        Initialize RAG ingestion system
        
        Args:
            data_folder: Source folder for documents
            faiss_index_dir: Directory for FAISS index
            embedding_dimension: Dimension of embeddings
        """
        self.data_folder = data_folder
        self.faiss_index_dir = faiss_index_dir
        self.embedding_dimension = embedding_dimension
        
        # Initialize components
        self.file_parser = get_universal_parser()
        self.chunker = TextChunker(min_chunk_size=100, max_chunk_size=300)
        self.embedding_gen = EmbeddingGenerator()
        
        self.faiss_index = IncrementalFAISSIndex(
            index_dir=faiss_index_dir,
            dimension=embedding_dimension
        )
        # Load existing index or create new one
        self.faiss_index.load_or_create()
        
        self.metadata_store = MetadataStore(
            metadata_file=os.path.join(faiss_index_dir, "meta.json")
        )
        
        self.processed_files = ProcessedFilesTracker("processed_files.json")
        self.ingestion_metadata = IngestionMetadata("ingestion_metadata.json")
        self.data_source = DataSourceManager(data_folder)
        
        logger.info("RAG Ingestion System initialized")
    
    def ingest_file(self, file_path: str) -> Tuple[int, List[str]]:
        """
        Ingest a single file
        
        Args:
            file_path: Path to file to ingest
            
        Returns:
            Tuple of (chunks_created, chunk_ids)
        """
        file_path = Path(file_path)
        file_name = file_path.name
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing: {file_name}")
        logger.info(f"{'='*60}")
        
        try:
            # Step 1: Extract text
            logger.info("Step 1: Extracting text...")
            text = self.file_parser.extract_text(str(file_path))
            logger.info(f"✓ Extracted {len(text)} characters")
            
            # Step 2: Chunk text
            logger.info("Step 2: Chunking text...")
            chunks = self.chunker.chunk_by_sentences(text, section="General")
            logger.info(f"✓ Created {len(chunks)} chunks")
            
            if not chunks:
                logger.warning(f"No chunks created from {file_name}")
                self.processed_files.mark_processed(file_name, 0, "skipped")
                self.processed_files.save()
                return 0, []
            
            # Step 3: Generate embeddings
            logger.info("Step 3: Generating embeddings...")
            chunk_texts = [chunk.text for chunk in chunks]
            embeddings = self.embedding_gen.embed_texts(chunk_texts)
            logger.info(f"✓ Generated {len(embeddings)} embeddings")
            
            # Step 4: Update FAISS index
            logger.info("Step 4: Updating FAISS index...")
            chunk_ids = []
            chunk_list_for_metadata = []
            
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                chunk_id = f"{file_name}_{i}_{chunk.chunk_id}"
                chunk_ids.append(chunk_id)
                
                chunk_list_for_metadata.append({
                    'chunk_id': chunk_id,
                    'text': chunk.text,
                    'source_file': file_name,
                    'section': chunk.section,
                    'word_count': chunk.word_count,
                    'chunk_index': i
                })
            
            # Add to FAISS (skip duplicates)
            faiss_ids = self.faiss_index.add_embeddings(
                embeddings,
                chunk_ids,
                overwrite=False
            )
            logger.info(f"✓ Added {len(faiss_ids)} new embeddings to FAISS")
            
            # Step 5: Store metadata
            logger.info("Step 5: Storing metadata...")
            self.metadata_store.add_chunks_batch(chunk_list_for_metadata)
            logger.info(f"✓ Stored metadata for {len(chunk_list_for_metadata)} chunks")
            
            # Step 6: Save to disk
            logger.info("Step 6: Saving to disk...")
            self.faiss_index.save()
            self.metadata_store.save()
            logger.info("✓ Saved FAISS index and metadata")
            
            # Mark as processed
            self.processed_files.mark_processed(file_name, len(chunks), "success")
            self.processed_files.save()
            
            logger.info(f"✅ Successfully processed {file_name}")
            logger.info(f"   - Chunks: {len(chunks)}")
            logger.info(f"   - Index size: {self.faiss_index.get_stats()['total_vectors']}")
            
            return len(chunks), chunk_ids
            
        except Exception as e:
            logger.error(f"❌ Error processing {file_name}: {str(e)}")
            self.processed_files.mark_processed(file_name, 0, "error")
            self.processed_files.save()
            return 0, []
    
    def ingest_all_new_files(self) -> Dict:
        """
        Ingest all new files in data folder
        
        Returns:
            Statistics dictionary
        """
        logger.info("\n" + "="*80)
        logger.info("STARTING INCREMENTAL RAG INGESTION")
        logger.info("="*80)
        
        start_time = time.time()
        
        # Get new files
        new_files = self.data_source.get_new_files(self.processed_files)
        
        if not new_files:
            logger.info("✓ No new files to process")
            return {
                'files_processed': 0,
                'chunks_created': 0,
                'duration': 0,
                'status': 'no_new_files'
            }
        
        logger.info(f"\nFound {len(new_files)} new files to process:")
        for f in new_files:
            logger.info(f"  - {f.name} ({self.data_source.get_file_size(f)} bytes)")
        
        # Process files
        total_chunks = 0
        successful_files = 0
        failed_files = 0
        
        for file_path in new_files:
            chunks_created, chunk_ids = self.ingest_file(str(file_path))
            
            if chunks_created > 0:
                total_chunks += chunks_created
                successful_files += 1
            else:
                failed_files += 1
        
        # Record ingestion run
        duration = time.time() - start_time
        self.ingestion_metadata.record_ingestion_run(
            files_processed=successful_files,
            chunks_created=total_chunks,
            duration_seconds=duration,
            status="success" if successful_files > 0 else "no_files_processed"
        )
        self.ingestion_metadata.save()
        
        # Log summary
        logger.info("\n" + "="*80)
        logger.info("INGESTION SUMMARY")
        logger.info("="*80)
        logger.info(f"Duration: {duration:.2f} seconds")
        logger.info(f"Files processed: {successful_files}/{len(new_files)}")
        logger.info(f"Failed: {failed_files}")
        logger.info(f"Total chunks created: {total_chunks}")
        logger.info(f"FAISS index size: {self.faiss_index.get_stats()['total_vectors']}")
        logger.info(f"Metadata entries: {self.metadata_store.get_chunk_count()}")
        
        return {
            'files_processed': successful_files,
            'chunks_created': total_chunks,
            'failed_files': failed_files,
            'duration': duration,
            'status': 'success'
        }
    
    def get_stats(self) -> Dict:
        """Get system statistics"""
        return {
            'faiss_index': self.faiss_index.get_stats(),
            'metadata': {
                'chunk_count': self.metadata_store.get_chunk_count()
            },
            'processed_files': self.processed_files.get_stats(),
            'ingestion': self.ingestion_metadata.get_stats()
        }
    
    def retrieve_context(self, query: str, top_k: int = 3) -> List[Dict]:
        """
        Retrieve context for a query (for testing)
        
        Args:
            query: Query text
            top_k: Number of results
            
        Returns:
            List of relevant chunks with metadata
        """
        # Generate query embedding
        query_embedding = self.embedding_gen.embed_text(query)
        
        # Search FAISS
        results = self.faiss_index.search(query_embedding, top_k)
        
        # Retrieve metadata
        context = []
        for chunk_id, distance in results:
            metadata = self.metadata_store.get_chunk_metadata(chunk_id)
            if metadata:
                context.append({
                    'chunk_id': chunk_id,
                    'text': metadata.get('text'),
                    'source_file': metadata.get('source_file'),
                    'section': metadata.get('section'),
                    'distance': distance,
                    'relevance_score': 1.0 / (1.0 + distance)
                })
        
        return context


def main():
    """Main ingestion function"""
    import argparse
    
    # Set default paths relative to backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    default_data_folder = os.path.join(backend_dir, 'data_folder')
    default_faiss_dir = os.path.join(backend_dir, 'faiss_index')
    
    parser = argparse.ArgumentParser(description='RAG Incremental Ingestion System')
    parser.add_argument('--data-folder', default=default_data_folder, 
                       help='Path to data folder')
    parser.add_argument('--faiss-dir', default=default_faiss_dir,
                       help='Path to FAISS index directory')
    parser.add_argument('--stats', action='store_true',
                       help='Show statistics only')
    parser.add_argument('--query', type=str,
                       help='Test query for retrieval')
    parser.add_argument('--reset', action='store_true',
                       help='Reset processed files tracker')
    
    args = parser.parse_args()
    
    # Initialize system
    system = RAGIngestionSystem(
        data_folder=args.data_folder,
        faiss_index_dir=args.faiss_dir
    )
    
    # Handle reset
    if args.reset:
        logger.warning("Resetting processed files tracker...")
        system.processed_files.reset()
        system.processed_files.save()
        return
    
    # Handle stats
    if args.stats:
        logger.info("\nSystem Statistics:")
        import json
        stats = system.get_stats()
        logger.info(json.dumps(stats, indent=2))
        return
    
    # Handle query
    if args.query:
        logger.info(f"\nRetrieving context for: {args.query}")
        context = system.retrieve_context(args.query, top_k=3)
        
        if not context:
            logger.info("No results found")
        else:
            for i, chunk in enumerate(context, 1):
                logger.info(f"\nResult {i}:")
                logger.info(f"  File: {chunk['source_file']}")
                logger.info(f"  Section: {chunk['section']}")
                logger.info(f"  Relevance: {chunk['relevance_score']:.3f}")
                logger.info(f"  Text: {chunk['text'][:200]}...")
        return
    
    # Run ingestion
    system.ingest_all_new_files()


if __name__ == '__main__':
    main()
