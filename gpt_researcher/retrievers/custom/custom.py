from typing import Any, Dict, List, Optional
import requests
import os


class CustomRetriever:
    """
    Custom API Retriever for fetching search results from a specified endpoint.
    This class allows for flexible configuration through environment variables.
    """

    def __init__(self, query: str):
        # Get the API endpoint from environment variables
        self.endpoint = os.getenv('RETRIEVER_ENDPOINT')
        if not self.endpoint:
            raise ValueError("RETRIEVER_ENDPOINT environment variable not set")

        # Populate additional parameters from environment variables
        self.params = self._populate_params()
        # Store the search query
        self.query = query

    def _populate_params(self) -> Dict[str, Any]:
        """
        Populates parameters from environment variables prefixed with 'RETRIEVER_ARG_'.
        This allows for flexible configuration of the retriever without changing the code.

        Returns:
            A dictionary of parameter names (lowercase) and their values.
        """
        return {
            key[len('RETRIEVER_ARG_'):].lower(): value
            for key, value in os.environ.items()
            if key.startswith('RETRIEVER_ARG_')
        }

    def search(self, max_results: int = 5) -> Optional[List[Dict[str, Any]]]:
        """
        Performs the search using the custom retriever endpoint.

        Args:
            max_results: Maximum number of results to return (not currently used in the API call)

        Returns:
            A list of dictionaries containing search results, or None if the request fails.
            Each dictionary in the list represents a search result with 'url' and 'raw_content' keys.

        Note:
            The 'max_results' parameter is currently not used in the API call. It's included for
            potential future implementation or API compatibility.
        """
        try:
            # Make a GET request to the endpoint with query parameters
            response = requests.get(self.endpoint, params={**self.params, 'query': self.query})
            # Raise an exception for bad status codes
            response.raise_for_status()
            # Parse and return the JSON response
            return response.json()
        except requests.RequestException as e:
            # Log the error and return None if the request fails
            print(f"Failed to retrieve search results: {e}")
            return None