"""
@purpose: Pytest configuration for PDF generation tests
@prereq: Requires pytest and pytest-asyncio
@reference: Used by test_pdf_generation.py
"""

import pytest
import os
import tempfile
from pathlib import Path

@pytest.fixture(scope="session")
def test_output_dir():
    """Create temporary directory for test outputs"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)

@pytest.fixture(scope="session")
def sample_markdown():
    """Provide sample markdown content for tests"""
    return """
    # Sample Document
    
    This is a test document with various Markdown features.
    
    ## Features
    
    1. Headers
    2. Lists
    3. Code blocks
    4. Tables
    
    ### Code Example
    
    ```python
    def test_function():
        return "Hello, World!"
    ```
    
    ### Table Example
    
    | Name | Value |
    |------|-------|
    | A    | 1     |
    | B    | 2     |
    
    > This is a blockquote
    
    **Bold text** and *italic text*
    """

@pytest.fixture(scope="session")
def pdf_comparison_tool():
    """Provide utility functions for PDF comparison"""
    import PyPDF2
    
    def compare_pdfs(pdf1_stream, pdf2_stream):
        """Compare two PDF streams for content similarity"""
        reader1 = PyPDF2.PdfReader(pdf1_stream)
        reader2 = PyPDF2.PdfReader(pdf2_stream)
        
        if len(reader1.pages) != len(reader2.pages):
            return False
            
        for i in range(len(reader1.pages)):
            text1 = reader1.pages[i].extract_text()
            text2 = reader2.pages[i].extract_text()
            if text1 != text2:
                return False
                
        return True
        
    return compare_pdfs

@pytest.fixture(autouse=True)
def cleanup_temp_files():
    """Clean up any temporary files after each test"""
    yield
    # Clean up temp files in current directory
    for file in Path().glob("*.pdf"):
        try:
            file.unlink()
        except Exception:
            pass 