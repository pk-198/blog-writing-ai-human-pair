"""
Tavily Search API service for SERP fetching and competitor content extraction.
Handles all search operations and content retrieval from top-ranking pages.
"""

import httpx
from typing import List, Dict, Any, Optional
import time
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logger import setup_logger, log_api_call

logger = setup_logger(__name__)

TAVILY_API_URL = "https://api.tavily.com/search"
TAVILY_EXTRACT_URL = "https://api.tavily.com/extract"


class TavilyService:
    """Service for Tavily Search API interactions."""

    def __init__(self):
        self.api_key = settings.TAVILY_API_KEY
        self.timeout = 30.0

    async def _make_request(
        self,
        query: str,
        max_results: int = 10,
        include_content: bool = True,
        include_raw_content: bool = False
    ) -> Dict[str, Any]:
        """
        Make request to Tavily API.

        Args:
            query: Search query
            max_results: Number of results to return
            include_content: Whether to include page content
            include_raw_content: Whether to include raw HTML

        Returns:
            API response data
        """
        start_time = time.time()

        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "include_answer": True,
            "include_content": include_content,
            "include_raw_content": include_raw_content,
            "include_images": True
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(TAVILY_API_URL, json=payload)
                response.raise_for_status()

                duration_ms = (time.time() - start_time) * 1000
                log_api_call(logger, "Tavily", query, duration_ms, "success")

                return response.json()

        except httpx.HTTPError as e:
            duration_ms = (time.time() - start_time) * 1000
            log_api_call(logger, "Tavily", query, duration_ms, "error")
            logger.error(f"Tavily API request failed: {str(e)}")
            raise
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            log_api_call(logger, "Tavily", query, duration_ms, "error")
            logger.error(f"Tavily API unexpected error: {str(e)}")
            raise

    async def search_serp(
        self,
        keyword: str,
        num_results: int = 10
    ) -> Dict[str, Any]:
        """
        Fetch SERP results for a keyword.

        Args:
            keyword: Primary keyword to search
            num_results: Number of SERP results to fetch

        Returns:
            Dict with:
                - results: List of search results
                - answer: AI-generated answer summary
                - images: Related images
        """
        logger.info(f"Fetching SERP results for keyword: {keyword}")

        response = await self._make_request(
            query=keyword,
            max_results=num_results,
            include_content=True
        )

        # Extract and structure results
        results = []
        for item in response.get("results", []):
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", ""),
                "score": item.get("score", 0),
                "published_date": item.get("published_date", "")
            })

        return {
            "query": keyword,
            "results": results,
            "answer": response.get("answer", ""),
            "images": response.get("images", [])[:5],  # Top 5 images
            "search_depth": response.get("search_depth", "basic"),
            "fetched_at": datetime.now(timezone.utc).isoformat()
        }

    async def extract_content(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Extract full content from a single URL using Tavily extract endpoint.

        Args:
            url: URL to extract content from

        Returns:
            dict with extracted content and metadata, or None if extraction fails
        """
        logger.info(f"[Tavily] Extracting content from: {url}")

        payload = {
            "api_key": self.api_key,
            "urls": [url]
        }

        start_time = time.time()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    TAVILY_EXTRACT_URL,
                    json=payload,
                    timeout=self.timeout
                )
                response.raise_for_status()
                result = response.json()

            duration_ms = (time.time() - start_time) * 1000
            log_api_call(logger, "Tavily Extract", url, duration_ms, "success")

            if not result.get("results") or len(result["results"]) == 0:
                logger.warning(f"[Tavily] No results returned for: {url}")
                return None

            extracted = result["results"][0]
            raw_content = extracted.get("raw_content", "")

            if not raw_content:
                logger.warning(f"[Tavily] Empty content extracted from: {url}")
                return None

            # Structure response
            return {
                "url": url,
                "title": extracted.get("title", ""),
                "content": raw_content,
                "domain": self._extract_domain(url),
                "word_count": len(raw_content.split()),
                "fetched_at": datetime.now(timezone.utc).isoformat()
            }

        except httpx.HTTPStatusError as e:
            duration_ms = (time.time() - start_time) * 1000
            log_api_call(logger, "Tavily Extract", url, duration_ms, "error")
            logger.error(f"[Tavily] HTTP error extracting {url}: {e.response.status_code}")
            raise
        except httpx.TimeoutException:
            duration_ms = (time.time() - start_time) * 1000
            log_api_call(logger, "Tavily Extract", url, duration_ms, "timeout")
            logger.error(f"[Tavily] Timeout extracting {url}")
            raise
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            log_api_call(logger, "Tavily Extract", url, duration_ms, "error")
            logger.error(f"[Tavily] Error extracting {url}: {str(e)}")
            raise

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc.replace("www.", "")
        except:
            return "unknown"

    def _extract_headings(self, content: str) -> Dict[str, List[str]]:
        """
        Extract heading structure from content.
        Basic extraction - looks for capitalized sentences and patterns.

        Args:
            content: Page content text

        Returns:
            Dict with h1, h2, h3 lists (estimated)
        """
        # This is a simplified extraction
        # In production, you'd want to parse actual HTML or use more sophisticated methods
        lines = content.split('\n')
        headings = {
            "h1": [],
            "h2": [],
            "h3": []
        }

        for line in lines[:50]:  # Check first 50 lines
            line = line.strip()
            if len(line) > 10 and len(line) < 100:
                # Heuristic: Short, capitalized lines might be headings
                if line[0].isupper() and line.endswith(('.', '?', '!')):
                    if len(line) < 60:
                        headings["h2"].append(line)

        return headings

    async def get_related_searches(self, keyword: str) -> List[str]:
        """
        Get related search queries.

        Args:
            keyword: Primary keyword

        Returns:
            List of related search terms
        """
        logger.debug(f"Fetching related searches for: {keyword}")

        # Tavily doesn't have a specific "related searches" endpoint
        # But we can extract from the search results
        response = await self._make_request(
            query=f"{keyword} related",
            max_results=10,
            include_content=False
        )

        related = set()
        for item in response.get("results", []):
            title = item.get("title", "").lower()
            # Extract potential related keywords from titles
            if keyword.lower() in title:
                related.add(item.get("title", ""))

        return list(related)[:10]


# Singleton instance
tavily_service = TavilyService()
