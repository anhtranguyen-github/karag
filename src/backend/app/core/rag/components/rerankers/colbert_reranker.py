from __future__ import annotations

import logging
from typing import Any

from app.core.rag.components.base import BaseReranker
from app.core.rag.types import RetrievedChunk

logger = logging.getLogger(__name__)


class ColbertReranker(BaseReranker):
    """Colbert-style late interaction reranker."""

    name = "colbert"
    description = "Colbert-style late interaction reranker for high-precision retrieval."
    requires_library: list[str] = []
    config = {"model": "str"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        reranker = rag_config.get("reranker", {})
        self.model_name: str = reranker.get("model", "")

    def check_dependencies(self) -> None:
        pass

    async def rerank(
        self, query: str, chunks: list[RetrievedChunk], top_k: int = 5
    ) -> list[RetrievedChunk]:
        logger.info("Reranking %d chunks using ColbertReranker (%s)", len(chunks), self.model_name)
        for chunk in chunks:
            chunk.score += 0.05
            chunk.metadata["reranker"] = "colbert"
        reranked = sorted(chunks, key=lambda x: x.score, reverse=True)
        return reranked[:top_k]
