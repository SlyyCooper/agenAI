import asyncio
import os

# Import various document loaders from langchain_community
from langchain_community.document_loaders import (
    PyMuPDFLoader,  # For PDF files
    TextLoader,  # For plain text files
    UnstructuredCSVLoader,  # For CSV files
    UnstructuredExcelLoader,  # For Excel files
    UnstructuredMarkdownLoader,  # For Markdown files
    UnstructuredPowerPointLoader,  # For PowerPoint files
    UnstructuredWordDocumentLoader  # For Word documents
)


class DocumentLoader:
    """
    A class for loading documents from a specified directory.
    """

    def __init__(self, path):
        """
        Initialize the DocumentLoader with a path to the directory containing documents.
        """
        self.path = path

    async def load(self) -> list:
        """
        Asynchronously load all documents in the specified directory and its subdirectories.
        
        Returns:
            list: A list of dictionaries containing the raw content and filename of each document.
        """
        tasks = []
        # Walk through the directory tree
        for root, dirs, files in os.walk(self.path):
            for file in files:
                file_path = os.path.join(root, file)
                # Split the filename and extension
                file_name, file_extension_with_dot = os.path.splitext(file_path)
                file_extension = file_extension_with_dot.strip(".")
                # Create a task for each file to load it asynchronously
                tasks.append(self._load_document(file_path, file_extension))

        docs = []
        # Gather all the loading tasks and process them concurrently
        for pages in await asyncio.gather(*tasks):
            for page in pages:
                if page.page_content:
                    # Add non-empty pages to the docs list
                    docs.append({
                        "raw_content": page.page_content,
                        "url": os.path.basename(page.metadata['source'])
                    })
                    
        if not docs:
            raise ValueError("🤷 Failed to load any documents!")

        return docs

    async def _load_document(self, file_path: str, file_extension: str) -> list:
        """
        Load a single document based on its file extension.
        
        Args:
            file_path (str): The path to the file.
            file_extension (str): The extension of the file.
        
        Returns:
            list: A list of loaded document pages.
        """
        ret_data = []
        try:
            # Dictionary mapping file extensions to appropriate document loaders
            loader_dict = {
                "pdf": PyMuPDFLoader(file_path),
                "txt": TextLoader(file_path),
                "doc": UnstructuredWordDocumentLoader(file_path),
                "docx": UnstructuredWordDocumentLoader(file_path),
                "pptx": UnstructuredPowerPointLoader(file_path),
                "csv": UnstructuredCSVLoader(file_path, mode="elements"),
                "xls": UnstructuredExcelLoader(file_path, mode="elements"),
                "xlsx": UnstructuredExcelLoader(file_path, mode="elements"),
                "md": UnstructuredMarkdownLoader(file_path)
            }

            # Get the appropriate loader based on the file extension
            loader = loader_dict.get(file_extension, None)
            if loader:
                # Load the document if a suitable loader is found
                ret_data = loader.load()

        except Exception as e:
            # Print an error message if loading fails
            print(f"Failed to load document : {file_path}")
            print(e)

        return ret_data
