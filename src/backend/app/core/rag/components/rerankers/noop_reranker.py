from __future__ import annotations

from typing import Any

from app.core.rag.components.base import BaseReranker
from app.core.rag.types import RetrievedChunk


class NoOpReranker(BaseReranker):
    """A reranker that does nothing (identity reranker)."""

    name = "none"
    description = "A reranker that does nothing (identity reranker)."
    requires_library: list[str] = []
    config: dict[str, Any] = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass

    def check_dependencies(self) -> None:
        pass

    async def rerank(
        self, query: str, chunks: list[RetrievedChunk], top_k: int = 5
    ) -> list[RetrievedChunk]:
        return chunks[:top_k]