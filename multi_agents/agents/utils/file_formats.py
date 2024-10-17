import aiofiles
import urllib
import uuid
import mistune

# Asynchronous function to write text to a file
async def write_to_file(filename: str, text: str) -> None:
    """Asynchronously write text to a file in UTF-8 encoding.

    Args:
        filename (str): The filename to write to.
        text (str): The text to write.
    """
    # Convert text to UTF-8, replacing any problematic characters
    text_utf8 = text.encode('utf-8', errors='replace').decode('utf-8')

    # Open the file asynchronously and write the UTF-8 encoded text
    async with aiofiles.open(filename, "w", encoding='utf-8') as file:
        await file.write(text_utf8)

# Function to write text to a Markdown file
async def write_text_to_md(text: str, path: str) -> str:
    """Writes text to a Markdown file and returns the file path.

    Args:
        text (str): Text to write to the Markdown file.
        path (str): Directory path where the file will be saved.

    Returns:
        str: The file path of the generated Markdown file.
    """
    # Generate a unique task ID using UUID
    task = uuid.uuid4().hex
    # Create the full file path
    file_path = f"{path}/{task}.md"
    # Write the text to the file
    await write_to_file(file_path, text)
    print(f"Report written to {file_path}")
    return file_path

# Function to convert Markdown text to a PDF file
async def write_md_to_pdf(text: str, path: str) -> str:
    """Converts Markdown text to a PDF file and returns the file path.

    Args:
        text (str): Markdown text to convert.
        path (str): Directory path where the file will be saved.

    Returns:
        str: The encoded file path of the generated PDF.
    """
    # Generate a unique task ID using UUID
    task = uuid.uuid4().hex
    # Create the full file path
    file_path = f"{path}/{task}.pdf"

    try:
        # Import md2pdf here to avoid known import errors with gobject-2.0
        from md2pdf.core import md2pdf
        # Convert Markdown to PDF
        md2pdf(file_path,
               md_content=text,
               css_file_path="./multi_agents/agents/utils/pdf_styles.css",
               base_url=None)
        print(f"Report written to {file_path}")
    except Exception as e:
        print(f"Error in converting Markdown to PDF: {e}")
        return ""

    # URL-encode the file path to handle special characters
    encoded_file_path = urllib.parse.quote(file_path)
    return encoded_file_path

# Function to convert Markdown text to a Word (DOCX) file
async def write_md_to_word(text: str, path: str) -> str:
    """Converts Markdown text to a DOCX file and returns the file path.

    Args:
        text (str): Markdown text to convert.
        path (str): Directory path where the file will be saved.

    Returns:
        str: The encoded file path of the generated DOCX.
    """
    # Generate a unique task ID using UUID
    task = uuid.uuid4().hex
    # Create the full file path
    file_path = f"{path}/{task}.docx"

    try:
        # Import required libraries for Word document creation
        from htmldocx import HtmlToDocx
        from docx import Document
        # Convert Markdown to HTML using mistune
        html = mistune.html(text)
        # Create a new Word document
        doc = Document()
        # Convert the HTML to Word document format
        HtmlToDocx().add_html_to_document(html, doc)

        # Save the Word document
        doc.save(file_path)

        print(f"Report written to {file_path}")

        # URL-encode the file path to handle special characters
        encoded_file_path = urllib.parse.quote(f"{file_path}")
        return encoded_file_path

    except Exception as e:
        print(f"Error in converting Markdown to DOCX: {e}")
        return ""
