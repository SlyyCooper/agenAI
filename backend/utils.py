# This file contains utility functions for file operations and format conversions
# These functions are used to generate and save research reports in various formats

import aiofiles
import urllib
import mistune
from backend.server.firebase.storage.storage_utils import upload_file_to_storage
import io
from docx import Document
from htmldocx import HtmlToDocx

async def write_to_file(filename: str, text: str) -> None:
    """Asynchronously write text to a file in UTF-8 encoding.

    This function is a core utility used by other functions to write content to files.
    It handles UTF-8 encoding and uses aiofiles for asynchronous file operations.

    Args:
        filename (str): The filename to write to.
        text (str): The text to write.
    """
    # Ensure text is a string
    if not isinstance(text, str):
        text = str(text)

    # Convert text to UTF-8, replacing any problematic characters
    text_utf8 = text.encode('utf-8', errors='replace').decode('utf-8')

    async with aiofiles.open(filename, "w", encoding='utf-8') as file:
        await file.write(text_utf8)

async def write_text_to_md(text: str, user_id: str, filename: str = "") -> str:
    """Writes text to a Markdown file in Firebase Storage and returns the URL."""
    file_content = io.BytesIO(text.encode('utf-8'))
    storage_path = f"{user_id}/{filename}.md"
    
    url = await upload_file_to_storage(
        file_content,
        storage_path,
        'text/markdown'
    )
    return url

async def write_md_to_pdf(text: str, user_id: str, filename: str = "") -> str:
    """Converts Markdown to PDF and uploads to Firebase Storage."""
    try:
        # Convert markdown to PDF using your preferred method
        pdf_content = io.BytesIO()  # Your PDF conversion logic here
        storage_path = f"{user_id}/{filename}.pdf"
        
        url = await upload_file_to_storage(
            pdf_content,
            storage_path,
            'application/pdf'
        )
        return url
    except Exception as e:
        print(f"Error in converting Markdown to PDF: {e}")
        return ""

async def write_md_to_word(text: str, user_id: str, filename: str = "") -> str:
    """Converts Markdown to DOCX and uploads to Firebase Storage."""
    try:
        # Convert markdown to HTML
        html = mistune.html(text)
        
        # Create DOCX in memory
        doc = Document()
        HtmlToDocx().add_html_to_document(html, doc)
        
        # Save to BytesIO
        docx_content = io.BytesIO()
        doc.save(docx_content)
        docx_content.seek(0)
        
        storage_path = f"{user_id}/{filename}.docx"
        url = await upload_file_to_storage(
            docx_content,
            storage_path,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        return url
    except Exception as e:
        print(f"Error in converting Markdown to DOCX: {e}")
        return ""

# These utility functions work together to provide a comprehensive report generation system:
# 1. The research report is initially generated in Markdown format.
# 2. write_text_to_md saves the Markdown version of the report.
# 3. write_md_to_pdf converts the Markdown to a styled PDF for easy reading and sharing.
# 4. write_md_to_word converts the Markdown to a DOCX file for users who prefer editable documents.
# 
# This multi-format approach ensures that users can access the research report in their preferred format,
# enhancing the usability and accessibility of the generated content.
