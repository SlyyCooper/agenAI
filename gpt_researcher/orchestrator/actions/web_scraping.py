import asyncio
from typing import List, Dict, Any

from colorama import Fore, Style
from gpt_researcher.scraper.scraper import Scraper
from gpt_researcher.config.config import Config
from gpt_researcher.utils.logger import get_formatted_logger

logger = get_formatted_logger()

def scrape_urls(urls, cfg=None):
    """
    Scrapes the provided URLs using the Scraper class.
    
    Args:
        urls: List of URLs to scrape
        cfg: Config object (optional) containing user agent and scraper settings

    Returns:
        content: List of scraped content from the URLs

    """
    content = []
    # Set a default user agent if no config is provided
    user_agent = (
        cfg.user_agent
        if cfg
        else "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    )
    try:
        # Use the Scraper class to scrape the URLs
        content = Scraper(urls, user_agent, cfg.scraper).run()
    except Exception as e:
        # Log any errors that occur during scraping
        print(f"{Fore.RED}Error in scrape_urls: {e}{Style.RESET_ALL}")
    return content

async def filter_urls(urls: List[str], config: Config) -> List[str]:
    """
    Filter URLs based on configuration settings.

    Args:
        urls (List[str]): List of URLs to filter.
        config (Config): Configuration object containing excluded domains.

    Returns:
        List[str]: Filtered list of URLs.
    """
    filtered_urls = []
    for url in urls:
        # Check if the URL contains any excluded domains from the config
        if not any(excluded in url for excluded in config.excluded_domains):
            filtered_urls.append(url)
    return filtered_urls

async def extract_main_content(html_content: str) -> str:
    """
    Extract the main content from HTML.
    This is a placeholder function that currently returns the raw HTML.

    Args:
        html_content (str): Raw HTML content.

    Returns:
        str: Extracted main content (currently just returns the input HTML).
    """
    # TODO: Implement content extraction logic
    # This could involve using libraries like BeautifulSoup or custom parsing logic
    return html_content

async def process_scraped_data(scraped_data: List[Dict[str, Any]], config: Config) -> List[Dict[str, Any]]:
    """
    Process the scraped data to extract and clean the main content.

    Args:
        scraped_data (List[Dict[str, Any]]): List of dictionaries containing scraped data.
        config (Config): Configuration object.

    Returns:
        List[Dict[str, Any]]: Processed scraped data.
    """
    processed_data = []
    for item in scraped_data:
        if item['status'] == 'success':
            # Extract the main content from successful scrapes
            main_content = await extract_main_content(item['content'])
            processed_data.append({
                'url': item['url'],
                'content': main_content,
                'status': 'success'
            })
        else:
            # Keep unsuccessful scrapes as is
            processed_data.append(item)
    return processed_data