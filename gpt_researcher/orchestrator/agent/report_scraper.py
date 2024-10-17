import asyncio
from typing import List, Dict
from gpt_researcher.orchestrator.actions import scrape_urls

class ReportScraper:
    """
    A class responsible for scraping web content based on URLs or search queries.
    """

    def __init__(self, researcher):
        """
        Initialize the ReportScraper with a researcher object.
        
        Args:
            researcher: The main researcher object that contains configuration and utilities.
        """
        self.researcher = researcher

    async def scrape_urls(self, urls: List[str]) -> List[Dict]:
        """
        Scrape content from a list of URLs asynchronously.

        Args:
            urls (List[str]): List of URLs to scrape.

        Returns:
            List[Dict]: List of scraped content results, where each dict contains information about a scraped URL.
        """
        # Log the start of scraping if verbose mode is on
        if self.researcher.verbose:
            await self.researcher.stream_output(
                "logs",
                "scraping_urls",
                f"🌐 Scraping content from {len(urls)} URLs...",
                self.researcher.websocket,
            )

        # Use asyncio to run the CPU-bound scraping task in a separate thread
        scraped_content = await asyncio.to_thread(scrape_urls, urls, self.researcher.cfg)

        # Log the completion of scraping if verbose mode is on
        if self.researcher.verbose:
            await self.researcher.stream_output(
                "logs",
                "scraping_complete",
                f"✅ Scraping complete. Retrieved content from {len(scraped_content)} sources.",
                self.researcher.websocket,
            )

        return scraped_content

    async def scrape_data_by_query(self, query: str) -> List[Dict]:
        """
        Search for URLs based on a query and scrape their content.

        Args:
            query (str): The query to search for.

        Returns:
            List[Dict]: List of scraped content results.
        """
        # Log the start of the search process if verbose mode is on
        if self.researcher.verbose:
            await self.researcher.stream_output(
                "logs",
                "searching_query",
                f"🔍 Searching for relevant URLs for query: '{query}'...",
                self.researcher.websocket,
            )

        # Search for URLs based on the query
        search_urls = await self._search_urls(query)
        # Filter out already visited URLs
        new_search_urls = await self._get_new_urls(search_urls)

        # Log the start of scraping for the found URLs if verbose mode is on
        if self.researcher.verbose:
            await self.researcher.stream_output(
                "logs",
                "scraping_query_urls",
                f"🌐 Scraping content from {len(new_search_urls)} URLs found for query: '{query}'...",
                self.researcher.websocket,
            )

        # Scrape the content from the new URLs
        scraped_content = await self.scrape_urls(new_search_urls)

        return scraped_content

    async def _search_urls(self, query: str) -> List[str]:
        """
        Search for URLs based on a query using configured retrievers.

        Args:
            query (str): The query to search for.

        Returns:
            List[str]: List of URLs found.
        """
        search_urls = []
        # Iterate through all configured retrievers
        for retriever_class in self.researcher.retrievers:
            # Initialize the retriever with the query
            retriever = retriever_class(query)
            # Use asyncio to run the CPU-bound search in a separate thread
            search_results = await asyncio.to_thread(
                retriever.search, max_results=self.researcher.cfg.max_search_results_per_query
            )
            # Extract URLs from the search results
            search_urls.extend([url.get("href") for url in search_results])
        return search_urls

    async def _get_new_urls(self, urls: List[str]) -> List[str]:
        """
        Filter out already visited URLs and add new ones to the visited set.

        Args:
            urls (List[str]): List of URLs to filter.

        Returns:
            List[str]: List of new, unvisited URLs.
        """
        new_urls = []
        for url in urls:
            # Check if the URL has not been visited before
            if url not in self.researcher.visited_urls:
                # Add the URL to the set of visited URLs
                self.researcher.visited_urls.add(url)
                new_urls.append(url)
                # Log the addition of the new URL if verbose mode is on
                if self.researcher.verbose:
                    await self.researcher.stream_output(
                        "logs",
                        "added_source_url",
                        f"✅ Added source URL to research: {url}\n",
                        self.researcher.websocket,
                        True,
                        url,
                    )
        return new_urls
