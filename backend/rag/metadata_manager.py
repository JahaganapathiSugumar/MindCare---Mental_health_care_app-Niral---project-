"""
Metadata manager for processed files tracking
"""

import os
import json
import logging
from typing import Dict, List, Set
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)


class ProcessedFilesTracker:
    """Track which files have been processed to avoid reprocessing"""
    
    def __init__(self, tracker_file: str = "processed_files.json"):
        """
        Initialize processed files tracker
        
        Args:
            tracker_file: Path to JSON file storing processed file info
        """
        self.tracker_file = tracker_file
        self.processed_files = {}  # filename → {processed_at, status, chunks_count}
        
        self.load()
    
    def load(self) -> bool:
        """Load processed files list from disk"""
        if os.path.exists(self.tracker_file):
            try:
                with open(self.tracker_file, 'r') as f:
                    self.processed_files = json.load(f)
                logger.info(f"✓ Loaded {len(self.processed_files)} processed files")
                return True
            except Exception as e:
                logger.error(f"Error loading processed files: {str(e)}")
                return False
        
        logger.info("No processed files tracker found, starting fresh")
        return False
    
    def save(self) -> bool:
        """Save processed files list to disk"""
        try:
            with open(self.tracker_file, 'w') as f:
                json.dump(self.processed_files, f, indent=2)
            logger.info(f"✓ Saved {len(self.processed_files)} processed files")
            return True
        except Exception as e:
            logger.error(f"Error saving processed files: {str(e)}")
            return False
    
    def is_processed(self, filename: str) -> bool:
        """
        Check if file has been processed
        
        Args:
            filename: File name
            
        Returns:
            True if processed, False otherwise
        """
        return filename in self.processed_files
    
    def mark_processed(self, filename: str, chunks_count: int = 0, 
                      status: str = "success") -> None:
        """
        Mark file as processed
        
        Args:
            filename: File name
            chunks_count: Number of chunks created
            status: Processing status (success, error, skipped)
        """
        self.processed_files[filename] = {
            'processed_at': datetime.utcnow().isoformat(),
            'status': status,
            'chunks_count': chunks_count
        }
        logger.info(f"Marked {filename} as processed ({chunks_count} chunks)")
    
    def get_unprocessed_files(self, file_list: List[str]) -> List[str]:
        """
        Get list of unprocessed files from a file list
        
        Args:
            file_list: List of file names
            
        Returns:
            List of unprocessed file names
        """
        return [f for f in file_list if not self.is_processed(f)]
    
    def get_processed_count(self) -> int:
        """Get total count of processed files"""
        return len(self.processed_files)
    
    def get_successful_count(self) -> int:
        """Get count of successfully processed files"""
        return sum(1 for f in self.processed_files.values() 
                  if f.get('status') == 'success')
    
    def get_stats(self) -> Dict:
        """Get processing statistics"""
        total = len(self.processed_files)
        successful = self.get_successful_count()
        failed = sum(1 for f in self.processed_files.values() 
                    if f.get('status') == 'error')
        total_chunks = sum(f.get('chunks_count', 0) 
                          for f in self.processed_files.values())
        
        return {
            'total_processed': total,
            'successful': successful,
            'failed': failed,
            'total_chunks': total_chunks,
            'avg_chunks_per_file': total_chunks / max(successful, 1)
        }
    
    def reset(self) -> None:
        """Clear all processed file records"""
        self.processed_files = {}
        logger.warning("Cleared all processed file records")
    
    def remove_file(self, filename: str) -> None:
        """Remove a file from processed list (for reprocessing)"""
        if filename in self.processed_files:
            del self.processed_files[filename]
            logger.info(f"Removed {filename} from processed files")


class IngestionMetadata:
    """Manage ingestion metadata and statistics"""
    
    def __init__(self, metadata_file: str = "ingestion_metadata.json"):
        """
        Initialize ingestion metadata
        
        Args:
            metadata_file: Path to metadata JSON file
        """
        self.metadata_file = metadata_file
        self.metadata = {
            'last_ingestion': None,
            'total_files_processed': 0,
            'total_chunks_created': 0,
            'ingestion_runs': []
        }
        
        self.load()
    
    def load(self) -> bool:
        """Load metadata from disk"""
        if os.path.exists(self.metadata_file):
            try:
                with open(self.metadata_file, 'r') as f:
                    self.metadata = json.load(f)
                logger.info("✓ Loaded ingestion metadata")
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
            logger.info("✓ Saved ingestion metadata")
            return True
        except Exception as e:
            logger.error(f"Error saving metadata: {str(e)}")
            return False
    
    def record_ingestion_run(self, files_processed: int, chunks_created: int,
                            duration_seconds: float, status: str = "success") -> None:
        """
        Record an ingestion run
        
        Args:
            files_processed: Number of files processed
            chunks_created: Number of chunks created
            duration_seconds: Duration in seconds
            status: Run status
        """
        run = {
            'timestamp': datetime.utcnow().isoformat(),
            'files_processed': files_processed,
            'chunks_created': chunks_created,
            'duration_seconds': duration_seconds,
            'status': status
        }
        
        self.metadata['ingestion_runs'].append(run)
        self.metadata['last_ingestion'] = run['timestamp']
        self.metadata['total_files_processed'] += files_processed
        self.metadata['total_chunks_created'] += chunks_created
        
        logger.info(f"Recorded ingestion run: {files_processed} files, {chunks_created} chunks")
    
    def get_stats(self) -> Dict:
        """Get ingestion statistics"""
        runs = self.metadata.get('ingestion_runs', [])
        successful_runs = [r for r in runs if r.get('status') == 'success']
        
        return {
            'last_ingestion': self.metadata.get('last_ingestion'),
            'total_files_processed': self.metadata.get('total_files_processed', 0),
            'total_chunks_created': self.metadata.get('total_chunks_created', 0),
            'total_runs': len(runs),
            'successful_runs': len(successful_runs),
            'avg_chunks_per_run': (
                sum(r.get('chunks_created', 0) for r in successful_runs) / 
                max(len(successful_runs), 1)
            )
        }
    
    def get_last_ingestion(self) -> Dict:
        """Get last ingestion run details"""
        runs = self.metadata.get('ingestion_runs', [])
        return runs[-1] if runs else None


class DataSourceManager:
    """Manage data source directory and file discovery"""
    
    def __init__(self, data_folder: str = "data_folder"):
        """
        Initialize data source manager
        
        Args:
            data_folder: Path to data folder
        """
        self.data_folder = Path(data_folder)
        self.supported_formats = {'.docx', '.pdf', '.txt'}
        
        # Create folder if it doesn't exist
        self.data_folder.mkdir(parents=True, exist_ok=True)
        logger.info(f"Data folder: {self.data_folder}")
    
    def discover_files(self) -> List[Path]:
        """
        Discover all supported files in data folder
        
        Returns:
            List of file paths
        """
        files = []
        
        for ext in self.supported_formats:
            files.extend(self.data_folder.glob(f"*{ext}"))
            files.extend(self.data_folder.glob(f"**/*{ext}"))  # Recursive
        
        # Remove duplicates and sort
        files = sorted(set(files))
        logger.info(f"Discovered {len(files)} files")
        return files
    
    def get_new_files(self, processed_tracker: ProcessedFilesTracker) -> List[Path]:
        """
        Get list of files that haven't been processed
        
        Args:
            processed_tracker: Processed files tracker
            
        Returns:
            List of unprocessed file paths
        """
        all_files = self.discover_files()
        new_files = [f for f in all_files 
                    if not processed_tracker.is_processed(f.name)]
        
        logger.info(f"Found {len(new_files)} new files to process")
        return new_files
    
    def get_file_size(self, file_path: Path) -> int:
        """Get file size in bytes"""
        return file_path.stat().st_size
    
    def get_file_modified_time(self, file_path: Path) -> str:
        """Get file modification time"""
        mtime = file_path.stat().st_mtime
        return datetime.fromtimestamp(mtime).isoformat()
