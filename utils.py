# This file contains utility functions for file operations and format conversions
# These functions are used to generate and save research reports in various formats

import aiofiles
import urllib
import mistune

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

async def write_text_to_md(text: str, filename: str = "") -> str:
    """Writes text to a Markdown file and returns the file path.

    This function is used to save the research report in Markdown format.
    It's part of the report generation process, providing a basic text format output.

    Args:
        text (str): Text to write to the Markdown file.
        filename (str): Base name for the file (without extension).

    Returns:
        str: The URL-encoded file path of the generated Markdown file.
    """
    file_path = f"outputs/{filename[:60]}.md"
    await write_to_file(file_path, text)
    return urllib.parse.quote(file_path)

async def write_md_to_pdf(text: str, filename: str = "") -> str:
    """Converts Markdown text to a PDF file and returns the file path.

    This function generates a PDF version of the research report.
    It uses md2pdf library to convert Markdown to PDF, applying custom CSS styling.

    Args:
        text (str): Markdown text to convert.
        filename (str): Base name for the file (without extension).

    Returns:
        str: The URL-encoded file path of the generated PDF.
    """
    file_path = f"outputs/{filename[:60]}.pdf"

    try:
        from md2pdf.core import md2pdf
        md2pdf(file_path,
               md_content=text,
               css_file_path="./frontend/pdf_styles.css",
               base_url=None)
        print(f"Report written to {file_path}")
    except Exception as e:
        print(f"Error in converting Markdown to PDF: {e}")
        return ""

    encoded_file_path = urllib.parse.quote(file_path)
    return encoded_file_path

async def write_md_to_word(text: str, filename: str = "") -> str:
    """Converts Markdown text to a DOCX file and returns the file path.

    This function generates a Word document version of the research report.
    It uses mistune to convert Markdown to HTML, then htmldocx to convert HTML to DOCX.

    Args:
        text (str): Markdown text to convert.
        filename (str): Base name for the file (without extension).

    Returns:
        str: The URL-encoded file path of the generated DOCX.
    """
    file_path = f"outputs/{filename[:60]}.docx"

    try:
        from docx import Document
        from htmldocx import HtmlToDocx
        # Convert report markdown to HTML
        html = mistune.html(text)
        # Create a document object
        doc = Document()
        # Convert the html generated from the report to document format
        HtmlToDocx().add_html_to_document(html, doc)

        # Saving the docx document to file_path
        doc.save(file_path)

        print(f"Report written to {file_path}")

        encoded_file_path = urllib.parse.quote(file_path)
        return encoded_file_path

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