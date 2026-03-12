from __future__ import annotations

from typing import Any

from app.rag.components.base import BaseReranker
from app.rag.schemas.types import RetrievedChunk


class NoOpReranker(BaseReranker):
    """A reranker that does nothing (identity reranker)."""

    name = "none"
    description = "A reranker that does nothing (identity reranker)."
    requirement: list[str] = []
    config: dict[str, Any] = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass



    async def rerank(
        self, query: str, chunks: list[RetrievedChunk], top_k: int = 5
    ) -> list[RetrievedChunk]:
        return chunks[:top_k]