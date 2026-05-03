"""
Document loader for extracting CBT knowledge from .docx files
"""

import os
from docx import Document
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)


class CBTDocxLoader:
    """Load and extract text from CBT knowledge .docx files"""
    
    def __init__(self, file_path: str):
        """
        Initialize loader with docx file path
        
        Args:
            file_path: Path to the .docx file
        """
        self.file_path = file_path
        self.content = []
        
    def load_document(self) -> List[Tuple[str, str]]:
        """
        Load content from .docx file
        
        Returns:
            List of tuples: (section_title, paragraph_text)
        """
        if not os.path.exists(self.file_path):
            logger.error(f"Document not found: {self.file_path}")
            raise FileNotFoundError(f"Document not found: {self.file_path}")
        
        try:
            doc = Document(self.file_path)
            paragraphs = []
            current_section = "General"
            
            for element in doc.element.body:
                # Check if it's a heading
                if element.tag.endswith('heading'):
                    current_section = element.text
                    logger.info(f"Found section: {current_section}")
                
                # Extract paragraphs
                elif element.tag.endswith('p'):
                    paragraph_text = element.text.strip()
                    if paragraph_text:
                        paragraphs.append((current_section, paragraph_text))
            
            logger.info(f"Loaded {len(paragraphs)} paragraphs from document")
            return paragraphs
            
        except Exception as e:
            logger.error(f"Error loading document: {str(e)}")
            raise
    
    def get_raw_text(self) -> str:
        """
        Get all text as single string
        
        Returns:
            Full document text
        """
        paragraphs = self.load_document()
        return "\n\n".join([f"[{section}]\n{text}" for section, text in paragraphs])
    
    def get_structured_content(self) -> dict:
        """
        Get structured content by sections
        
        Returns:
            Dictionary: {section_title: [paragraphs]}
        """
        paragraphs = self.load_document()
        structured = {}
        
        for section, text in paragraphs:
            if section not in structured:
                structured[section] = []
            structured[section].append(text)
        
        return structured


def load_cbt_knowledge(file_path: str) -> List[Tuple[str, str]]:
    """
    Convenience function to load CBT knowledge
    
    Args:
        file_path: Path to CBT knowledge .docx file
        
    Returns:
        List of (section, text) tuples
    """
    loader = CBTDocxLoader(file_path)
    return loader.load_document()
