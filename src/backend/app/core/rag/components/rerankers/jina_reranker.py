from __future__ import annotations

from typing import Any, Sequence

from app.core.rag.components.base import BaseReranker
from app.core.rag.types import RerankResult, RetrievedChunk


class JinaReranker(BaseReranker):
    """External reranker service using Jina AI's Reranker API."""

    name = "jina"
    description = "External reranker service using Jina AI's Reranker API."
    requires_library = ["requests"]
    config = {"model": "str", "api_key": "str", "api_base": "str"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        reranker = rag_config.get("reranker", {})
        self.model: str = reranker.get("model", "")
        self.api_key: str = reranker.get("api_key", "") or ""
        self.api_base: str = reranker.get("api_base", "") or ""

    def check_dependencies(self) -> None:
        pass

    def _request_rerank(self, query: str, documents: Sequence[str], top_n: int) -> list[RerankResult]:
        import requests as http_requests

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
            return [
                RerankResult(
                    index=int(item.get("index", 0)),
                    score=float(item.get("relevance_score", 0.0)),
                    text=documents[int(item.get("index", 0))] if int(item.get("index", 0)) < len(documents) else None,
                )
                for item in body.get("results", [])
            ]
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
            if res.index < len(chunks):
                chunk = chunks[res.index]
                chunk.score = res.score
                reordered.append(chunk)
        return reordered[:top_k] if reordered else chunks[:top_k]
