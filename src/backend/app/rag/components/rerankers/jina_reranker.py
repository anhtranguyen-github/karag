from __future__ import annotations

import logging
from typing import Any, Sequence

try:
    import requests as http_requests
except ImportError:
    logging.warning("requests not installed, JinaReranker will be unavailable.")
    http_requests = None

from app.rag.components.base import BaseReranker
from app.rag.schemas.types import RerankResult, RetrievedChunk


class JinaReranker(BaseReranker):
    """External reranker service using Jina AI's Reranker API."""

    name = "jina"
    description = "External reranker service using Jina AI's Reranker API."
    requirement = ["requests"]
    config = {"model": "str", "api_key": "str", "api_base": "str"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        reranker = rag_config.get("reranker", {})
        # Default to Jina v3 as requested
        self.model: str = reranker.get("model", "jina-reranker-v3")
        self.api_key: str = reranker.get("api_key")
        self.api_base: str = reranker.get("api_base", "https://api.jina.ai/v1/rerank")
        if not self.api_key:
             # Try to get from env if not in config
             import os
             self.api_key = os.getenv("JINA_API_KEY")
        if not self.model or not self.api_base:
             raise ValueError("model and api_base must be provided in 'reranker' config.")

    def _request_rerank(self, query: str, documents: Sequence[str], top_n: int) -> list[dict]:
        if http_requests is None:
             raise RuntimeError("requests not installed, JinaReranker unavailable.")

        payload = {
            "model": self.model,
            "query": query,
            "documents": list(documents),
            "top_n": top_n,
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
        }
        try:
            response = http_requests.post(self.api_base, json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            body = response.json()
            return body.get("results", [])
        except Exception as exc:
            raise RuntimeError(f"Rerank request failed: {exc}") from exc

    async def rerank(
        self, query: str, chunks: list[RetrievedChunk], top_k: int = 5
    ) -> list[RetrievedChunk]:
        if not chunks:
            return chunks
        results = self._request_rerank(query, [c.text for c in chunks], top_k)
        reordered: list[RetrievedChunk] = []
        for res in results:
            idx = int(res.get("index", 0))
            score = float(res.get("relevance_score", 0.0))
            if idx < len(chunks):
                chunk = chunks[idx]
                chunk.score = score
                reordered.append(chunk)
        return reordered[:top_k] if reordered else chunks[:top_k]
