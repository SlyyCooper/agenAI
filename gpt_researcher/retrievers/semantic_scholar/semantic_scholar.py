from typing import Dict, List

import requests


class SemanticScholarSearch:
    """
    Semantic Scholar API Retriever
    This class provides functionality to search for academic papers using the Semantic Scholar API.
    """

    # The base URL for the Semantic Scholar API
    BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
    # Valid sorting criteria for the search results
    VALID_SORT_CRITERIA = ["relevance", "citationCount", "publicationDate"]

    def __init__(self, query: str, sort: str = "relevance"):
        """
        Initialize the SemanticScholarSearch class with a query and sort criterion.

        :param query: Search query string
        :param sort: Sort criterion ('relevance', 'citationCount', 'publicationDate')
        """
        self.query = query
        # Ensure that the provided sort criterion is valid
        assert sort in self.VALID_SORT_CRITERIA, "Invalid sort criterion"
        self.sort = sort.lower()

    def search(self, max_results: int = 20) -> List[Dict[str, str]]:
        """
        Perform the search on Semantic Scholar and return results.

        :param max_results: Maximum number of results to retrieve
        :return: List of dictionaries containing title, href, and body of each paper
        """
        # Prepare the parameters for the API request
        params = {
            "query": self.query,
            "limit": max_results,
            "fields": "title,abstract,url,venue,year,authors,isOpenAccess,openAccessPdf",
            "sort": self.sort,
        }

        try:
            # Send a GET request to the Semantic Scholar API
            response = requests.get(self.BASE_URL, params=params)
            # Raise an exception for bad status codes
            response.raise_for_status()
        except requests.RequestException as e:
            # Handle any errors that occur during the API request
            print(f"An error occurred while accessing Semantic Scholar API: {e}")
            return []

        # Extract the 'data' field from the JSON response
        results = response.json().get("data", [])
        search_result = []

        # Process each result in the API response
        for result in results:
            # Only include open access papers with available PDFs
            if result.get("isOpenAccess") and result.get("openAccessPdf"):
                search_result.append(
                    {
                        "title": result.get("title", "No Title"),
                        "href": result["openAccessPdf"].get("url", "No URL"),
                        "body": result.get("abstract", "Abstract not available"),
                    }
                )

        # Return the list of processed search results
        return search_result
