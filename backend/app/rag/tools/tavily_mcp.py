import httpx
import os
from typing import List, Dict, Any
import structlog

logger = structlog.get_logger(__name__)

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
TAVILY_SEARCH_URL = "https://api.tavily.com/search"

if not TAVILY_API_KEY:
    logger.warning(
        "TAVILY_API_KEY environment variable not set - Tavily search will be unavailable"
    )


class TavilySearchTool:
    """
    Lightweight Tavily web search tool using the direct REST API.
    Avoids the flaky MCP SSE transport which hangs indefinitely.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Execute web search using Tavily REST API.
        Returns a list of result dicts with url, title, content keys.
        """
        if not self.api_key:
            logger.error("tavily_search_failed_no_api_key")
            raise ValueError(
                "TAVILY_API_KEY not configured. Set the TAVILY_API_KEY environment variable."
            )

        logger.info("tavily_search_start", query=query)

        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "basic",
            "include_answer": False,
            "include_raw_content": False,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(TAVILY_SEARCH_URL, json=payload)
                response.raise_for_status()
                data = response.json()

            results = data.get("results", [])
            logger.info("tavily_search_complete", results=len(results))
            return results

        except httpx.TimeoutException:
            logger.error("tavily_search_timeout", query=query)
            return []
        except httpx.HTTPStatusError as e:
            logger.error(
                "tavily_search_http_error", status=e.response.status_code, error=str(e)
            )
            return []
        except Exception as e:
            logger.error("tavily_search_failed", error=str(e))
            return []


# Singleton
tavily_tool = TavilySearchTool(TAVILY_API_KEY)
