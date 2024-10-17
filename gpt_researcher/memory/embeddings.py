# Import necessary libraries
from langchain_community.vectorstores import FAISS
import os

# Set default OpenAI embedding model
OPENAI_EMBEDDING_MODEL = os.environ.get("OPENAI_EMBEDDING_MODEL","text-embedding-3-small")

class Memory:
    def __init__(self, embedding_provider, headers=None, **kwargs):
        # Initialize embedding object
        _embeddings = None
        # Set default headers if not provided
        headers = headers or {}
        
        # Use match-case to select the appropriate embedding provider
        match embedding_provider:
            case "ollama":
                # Ollama embeddings
                from langchain_community.embeddings import OllamaEmbeddings

                _embeddings = OllamaEmbeddings(
                    model=os.environ["OLLAMA_EMBEDDING_MODEL"],
                    base_url=os.environ["OLLAMA_BASE_URL"],
                )
            case "custom":
                # Custom OpenAI embeddings
                from langchain_openai import OpenAIEmbeddings

                _embeddings = OpenAIEmbeddings(
                    model=os.environ.get("OPENAI_EMBEDDING_MODEL", "custom"),
                    openai_api_key=headers.get(
                        "openai_api_key", os.environ.get("OPENAI_API_KEY", "custom")
                    ),
                    openai_api_base=os.environ.get(
                        "OPENAI_BASE_URL", "http://localhost:1234/v1"
                    ),  # default for lmstudio
                    check_embedding_ctx_length=False,
                )  # quick fix for lmstudio
            case "openai":
                # Standard OpenAI embeddings
                from langchain_openai import OpenAIEmbeddings

                _embeddings = OpenAIEmbeddings(
                    openai_api_key=headers.get("openai_api_key")
                    or os.environ.get("OPENAI_API_KEY"),
                    model=OPENAI_EMBEDDING_MODEL
                )
            case "azure_openai":
                # Azure OpenAI embeddings
                from langchain_openai import AzureOpenAIEmbeddings

                _embeddings = AzureOpenAIEmbeddings(
                    deployment=os.environ["AZURE_EMBEDDING_MODEL"], chunk_size=16
                )
            case "huggingface":
                # HuggingFace embeddings
                from langchain.embeddings import HuggingFaceEmbeddings

                _embeddings = HuggingFaceEmbeddings()

            case _:
                # Raise exception if embedding provider is not recognized
                raise Exception("Embedding provider not found.")

        # Store the selected embedding object
        self._embeddings = _embeddings

    def get_embeddings(self):
        # Return the stored embedding object
        return self._embeddings
