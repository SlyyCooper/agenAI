# config file
import json
import os


class Config:
    """Config class for GPT Researcher."""

    # Singleton instance
    _instance = None

    def __new__(cls, *args, **kwargs):
        # Ensure only one instance of Config is created
        if cls._instance is None:
            cls._instance = super(Config, cls).__new__(cls)
            cls._instance.initialize()
        return cls._instance

    def initialize(self):
        """Initialize the config class."""
        self.load_config()

    def load_config(self):
        """Load configuration from environment variables and config file."""
        # Load configuration from environment variables
        self.config_file = os.getenv("CONFIG_FILE")
        self.retrievers = self.parse_retrievers(os.getenv("RETRIEVER", "tavily"))
        self.embedding_provider = os.getenv("EMBEDDING_PROVIDER", "openai")
        self.similarity_threshold = int(os.getenv("SIMILARITY_THRESHOLD", 0.42))
        self.llm_provider = os.getenv("LLM_PROVIDER", "openai")
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", None)
        self.llm_model = os.getenv("DEFAULT_LLM_MODEL", "gpt-4o")
        self.fast_llm_model = os.getenv("FAST_LLM_MODEL", "gpt-4o")
        self.smart_llm_model = os.getenv("SMART_LLM_MODEL", "gpt-4o-2024-08-06")
        self.fast_token_limit = int(os.getenv("FAST_TOKEN_LIMIT", 2000))
        self.smart_token_limit = int(os.getenv("SMART_TOKEN_LIMIT", 4000))
        self.browse_chunk_max_length = int(os.getenv("BROWSE_CHUNK_MAX_LENGTH", 8192))
        self.summary_token_limit = int(os.getenv("SUMMARY_TOKEN_LIMIT", 700))
        self.temperature = float(os.getenv("TEMPERATURE", 0.4))
        self.llm_temperature = float(os.getenv("LLM_TEMPERATURE", 0.55))
        self.user_agent = os.getenv(
            "USER_AGENT",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
        )
        self.max_search_results_per_query = int(
            os.getenv("MAX_SEARCH_RESULTS_PER_QUERY", 5)
        )
        self.memory_backend = os.getenv("MEMORY_BACKEND", "local")
        self.total_words = int(os.getenv("TOTAL_WORDS", 900))
        self.report_format = os.getenv("REPORT_FORMAT", "APA")
        self.max_iterations = int(os.getenv("MAX_ITERATIONS", 3))
        self.agent_role = os.getenv("AGENT_ROLE", None)
        self.scraper = os.getenv("SCRAPER", "bs")
        self.max_subtopics = os.getenv("MAX_SUBTOPICS", 3)
        self.report_source = os.getenv("REPORT_SOURCE", None)
        self.doc_path = os.getenv("DOC_PATH", "./my-docs")
        self.llm_kwargs = {}

        # Load additional configuration from file
        self.load_config_file()
        if not hasattr(self, "llm_kwargs"):
            self.llm_kwargs = {}

        # Validate document path if set
        if self.doc_path:
            self.validate_doc_path()

    def update_config(self, config_updates):
        """Update configuration with new values."""
        for key, value in config_updates.items():
            if hasattr(self, key):
                setattr(self, key, value)
            else:
                print(f"Unknown configuration key: {key}")

    def to_dict(self):
        """Return configuration as a dictionary."""
        return {attr: getattr(self, attr) for attr in vars(self) if not attr.startswith('_') and not callable(getattr(self, attr))}

    def parse_retrievers(self, retriever_str: str):
        """Parse the retriever string into a list of retrievers and validate them."""
        # List of valid retrievers
        VALID_RETRIEVERS = [
            "arxiv",
            "bing",
            "custom",
            "duckduckgo",
            "exa",
            "google",
            "searchapi",
            "searx",
            "semantic_scholar",
            "serpapi",
            "serper",
            "tavily",
            "pubmed_central",
        ]
        # Split the input string into a list of retrievers
        retrievers = [retriever.strip() for retriever in retriever_str.split(",")]
        # Check for any invalid retrievers
        invalid_retrievers = [r for r in retrievers if r not in VALID_RETRIEVERS]
        if invalid_retrievers:
            raise ValueError(
                f"Invalid retriever(s) found: {', '.join(invalid_retrievers)}. "
                f"Valid options are: {', '.join(VALID_RETRIEVERS)}."
            )
        return retrievers

    def validate_doc_path(self):
        """Ensure that the folder exists at the doc path"""
        os.makedirs(self.doc_path, exist_ok=True)

    def load_config_file(self) -> None:
        """Load the config file."""
        # If no config file is specified, return
        if self.config_file is None:
            return None
        # Read and parse the JSON config file
        with open(self.config_file, "r") as f:
            config = json.load(f)
        # Update class attributes with values from the config file
        for key, value in config.items():
            setattr(self, key.lower(), value)
