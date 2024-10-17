import asyncio
import os

from langchain_core.documents import Document
from typing import List, Dict


# This class is designed to load and process documents using the LangChain library
# It supports the base Document class from langchain:
# https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/documents/base.py
class LangChainDocumentLoader:

    def __init__(self, documents: List[Document]):
        # Initialize the loader with a list of LangChain Document objects
        self.documents = documents

    async def load(self, metadata_source_index="title") -> List[Dict[str, str]]:
        # This method processes the documents and returns them in a standardized format
        # The 'metadata_source_index' parameter determines which metadata field to use as the URL
        docs = []
        for document in self.documents:
            # For each document, create a dictionary with two keys:
            # 1. 'raw_content': The main text content of the document
            # 2. 'url': The URL or identifier for the document, taken from its metadata
            docs.append(
                {
                    "raw_content": document.page_content,
                    # Use the specified metadata field as the URL, defaulting to an empty string if not found
                    "url": document.metadata.get(metadata_source_index, ""),
                }
            )
        # Return the list of processed documents
        return docs
