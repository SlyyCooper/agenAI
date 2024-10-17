# Import necessary modules
import os
from enum import Enum
from typing import Any, Dict, List, Optional

# Import LangChain components for retrieval and document handling
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
from langchain.schema import Document
from langchain.schema.retriever import BaseRetriever


class SearchAPIRetriever(BaseRetriever):
    """
    Search API retriever.
    This class is used to retrieve documents from a search API.
    """
    # List to store pages retrieved from the search API
    pages: List[Dict] = []

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        """
        Retrieve relevant documents based on the given query.
        
        Args:
            query (str): The search query.
            run_manager (CallbackManagerForRetrieverRun): Callback manager for the retriever run.
        
        Returns:
            List[Document]: A list of relevant documents.
        """
        # Convert each page in self.pages to a Document object
        docs = [
            Document(
                # Use the raw_content as the main content of the document
                page_content=page.get("raw_content", ""),
                # Add metadata including title and source URL
                metadata={
                    "title": page.get("title", ""),
                    "source": page.get("url", ""),
                },
            )
            for page in self.pages
        ]

        return docs

class SectionRetriever(BaseRetriever):
    """
    SectionRetriever:
    This class is used to retrieve sections while avoiding redundant subtopics.
    """
    # List to store sections, each represented as a dictionary
    sections: List[Dict] = []
    """
    sections example:
    [
        {
            "section_title": "Example Title",
            "written_content": "Example content"
        },
        ...
    ]
    """
    
    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        """
        Retrieve relevant sections based on the given query.
        
        Args:
            query (str): The search query.
            run_manager (CallbackManagerForRetrieverRun): Callback manager for the retriever run.
        
        Returns:
            List[Document]: A list of relevant sections as Document objects.
        """
        # Convert each section in self.sections to a Document object
        docs = [
            Document(
                # Use the written_content as the main content of the document
                page_content=page.get("written_content", ""),
                # Add metadata including the section title
                metadata={
                    "section_title": page.get("section_title", ""),
                },
            )
            for page in self.sections
        ]

        return docs