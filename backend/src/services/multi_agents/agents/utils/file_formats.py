import uuid
import mistune
from io import BytesIO
from src.services.firebase.storage_utils import upload_file_to_storage, save_research_report

async def write_text_to_md(text: str, user_id: str) -> str:
    """Writes text to a Markdown file in Firebase Storage.

    Args:
        text (str): Text to write to the Markdown file.
        user_id (str): User ID for storage path.

    Returns:
        str: The storage URL of the generated Markdown file.
    """
    task = uuid.uuid4().hex
    file_stream = BytesIO(text.encode('utf-8'))
    
    metadata = {
        'title': task,
        'userId': user_id,
        'type': 'markdown'
    }
    
    result = await save_research_report(
        file_stream=file_stream,
        metadata=metadata,
        content=text
    )
    
    return result['url']

async def write_md_to_pdf(text: str, user_id: str) -> str:
    """Converts Markdown text to PDF and uploads to Firebase Storage.

    Args:
        text (str): Markdown text to convert.
        user_id (str): User ID for storage path.

    Returns:
        str: The storage URL of the generated PDF.
    """
    try:
        # Convert markdown to PDF in memory
        from md2pdf.core import md2pdf
        pdf_stream = BytesIO()
        md2pdf(pdf_stream,
               md_content=text,
               css_file_path="./multi_agents/agents/utils/pdf_styles.css")
        
        pdf_stream.seek(0)
        task = uuid.uuid4().hex
        
        metadata = {
            'title': task,
            'userId': user_id,
            'type': 'pdf'
        }
        
        result = await save_research_report(
            file_stream=pdf_stream,
            metadata=metadata,
            content=text
        )
        
        return result['url']
        
    except Exception as e:
        print(f"Error in converting Markdown to PDF: {e}")
        return ""

async def write_md_to_word(text: str, user_id: str) -> str:
    """Converts Markdown text to DOCX and uploads to Firebase Storage.

    Args:
        text (str): Markdown text to convert.
        user_id (str): User ID for storage path.

    Returns:
        str: The storage URL of the generated DOCX.
    """
    try:
        from htmldocx import HtmlToDocx
        from docx import Document
        
        # Convert markdown to HTML
        html = mistune.html(text)
        
        # Create document in memory
        doc = Document()
        HtmlToDocx().add_html_to_document(html, doc)
        
        # Save to BytesIO
        docx_stream = BytesIO()
        doc.save(docx_stream)
        docx_stream.seek(0)
        
        task = uuid.uuid4().hex
        metadata = {
            'title': task,
            'userId': user_id,
            'type': 'docx'
        }
        
        result = await save_research_report(
            file_stream=docx_stream,
            metadata=metadata,
            content=text
        )
        
        return result['url']
        
    except Exception as e:
        print(f"Error in converting Markdown to DOCX: {e}")
        return ""
