"""
@purpose: Test suite for PDF generation with Firebase Cloud Storage integration
@prereq: Requires pytest, pytest-asyncio, and firebase-admin
"""

import pytest
import asyncio
from io import BytesIO
import PyPDF2
from unittest.mock import Mock, patch
from backend.utils import write_md_to_pdf
from backend.server.firebase.report_storage import generate_report_files

# Test data
SAMPLE_MARKDOWN = """
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

@pytest.fixture
def mock_firebase_storage():
    """Mock Firebase storage for testing"""
    with patch('backend.server.firebase.storage_utils.upload_file_to_storage') as mock_upload:
        mock_upload.return_value = "https://storage.googleapis.com/test-bucket/test.pdf"
        yield mock_upload

@pytest.fixture
def mock_firestore():
    """Mock Firestore for testing"""
    with patch('backend.server.firebase.report_storage.db') as mock_db:
        mock_db.collection.return_value.document.return_value.collection.return_value.document.return_value = Mock()
        yield mock_db

@pytest.mark.asyncio
async def test_pdf_generation_basic(mock_firebase_storage):
    """Test basic PDF generation with Firebase storage"""
    # Generate PDF
    pdf_stream = await write_md_to_pdf(SAMPLE_MARKDOWN, "test_document")
    
    # Verify it's a valid PDF
    assert isinstance(pdf_stream, BytesIO)
    pdf_reader = PyPDF2.PdfReader(pdf_stream)
    assert len(pdf_reader.pages) > 0

@pytest.mark.asyncio
async def test_report_storage_integration(mock_firebase_storage, mock_firestore):
    """Test complete report storage flow"""
    user_id = "test_user_123"
    filename = "test_report"
    
    # Generate and store report
    file_paths = await generate_report_files(
        SAMPLE_MARKDOWN,
        filename,
        user_id
    )
    
    # Verify storage URLs
    assert 'pdf' in file_paths
    assert file_paths['pdf'].startswith('https://storage.googleapis.com/')
    
    # Verify Firestore was called
    mock_firestore.collection.assert_called_with('users')

@pytest.mark.asyncio
async def test_pdf_formatting():
    """Test PDF formatting elements"""
    formatted_md = """
    # Formatting Test

    **Bold Text**
    *Italic Text*

    - List Item 1
    - List Item 2

    1. Numbered Item 1
    2. Numbered Item 2

    > Blockquote text

    `inline code`

    ```
    code block
    ```
    """
    
    pdf_stream = await write_md_to_pdf(formatted_md, "formatting_test")
    assert isinstance(pdf_stream, BytesIO)
    
    # Verify PDF content
    pdf_reader = PyPDF2.PdfReader(pdf_stream)
    text = pdf_reader.pages[0].extract_text()
    assert "Formatting Test" in text
    assert "Bold Text" in text
    assert "List Item" in text

@pytest.mark.asyncio
async def test_pdf_tables():
    """Test table rendering in PDF"""
    markdown_with_table = """
    | Column 1 | Column 2 |
    |----------|----------|
    | Value 1  | Value 2  |
    | Value 3  | Value 4  |
    """
    
    pdf_stream = await write_md_to_pdf(markdown_with_table, "table_test")
    assert isinstance(pdf_stream, BytesIO)
    
    # Verify table content
    pdf_reader = PyPDF2.PdfReader(pdf_stream)
    text = pdf_reader.pages[0].extract_text()
    assert "Column 1" in text
    assert "Value 1" in text

@pytest.mark.asyncio
async def test_pdf_special_characters():
    """Test handling of special characters"""
    special_chars_md = """
    # Special Characters Test

    Unicode characters: áéíóú ñ € ™ ©
    Symbols: &lt; &gt; &amp; &quot;
    Emojis: 🌟 🚀 📚
    """
    
    pdf_stream = await write_md_to_pdf(special_chars_md, "special_chars_test")
    assert isinstance(pdf_stream, BytesIO)
    
    # Verify special characters
    pdf_reader = PyPDF2.PdfReader(pdf_stream)
    text = pdf_reader.pages[0].extract_text()
    assert "Unicode characters" in text
    assert "áéíóú" in text

@pytest.mark.asyncio
async def test_pdf_error_handling():
    """Test error handling in PDF generation"""
    invalid_inputs = [
        None,
        "",
        "   ",
        "#" * 1000000  # Very large input
    ]
    
    for invalid_input in invalid_inputs:
        with pytest.raises(Exception):
            await write_md_to_pdf(invalid_input, "error_test")

@pytest.mark.asyncio
async def test_concurrent_pdf_generation(mock_firebase_storage, mock_firestore):
    """Test concurrent PDF generation"""
    user_id = "test_user_123"
    
    # Generate multiple reports concurrently
    tasks = [
        generate_report_files(
            f"# Document {i}\n\nContent {i}",
            f"doc_{i}",
            user_id
        )
        for i in range(5)
    ]
    
    # Execute concurrently
    results = await asyncio.gather(*tasks)
    
    # Verify all reports were generated
    for file_paths in results:
        assert 'pdf' in file_paths
        assert file_paths['pdf'].startswith('https://storage.googleapis.com/')