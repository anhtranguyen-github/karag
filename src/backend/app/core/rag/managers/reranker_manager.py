from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.core.rag.components.base import BaseReranker
from app.core.rag.components.rerankers.jina_reranker import JinaReranker
from app.core.rag.components.rerankers.noop_reranker import NoOpReranker
from app.core.rag.components.rerankers.colbert_reranker import ColbertReranker
from app.core.rag.types import RetrievedChunk

logger = logging.getLogger(__name__)


class RerankerManager:
    """Orchestrator for reranker components."""

    def __init__(self) -> None:
        self.rerankers: dict[str, Type[BaseReranker]] = {
            "jina": JinaReranker,
            "none": NoOpReranker,
            "colbert": ColbertReranker,
        }

    def available_components(self) -> list[str]:
        return list(self.rerankers.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseReranker:
        name = rag_config.get("reranker", {}).get("component", "")
        if name not in self.rerankers:
            raise ValueError(f"Reranker '{name}' not registered. Available: {list(self.rerankers.keys())}")
        component = self.rerankers[name](rag_config)
        component.check_dependencies()
        return component

    async def process(
        self,
        rag_config: dict[str, Any],
        query: str,
        chunks: list[RetrievedChunk],
    ) -> list[RetrievedChunk]:
        """Rerank chunks using top_k from rag_config, log timing."""
        reranker = self.resolve(rag_config)
        top_k = rag_config.get("reranker", {}).get("top_k", rag_config.get("retriever", {}).get("top_k", 5))
        logger.info("Reranker [%s] reranking %d chunk(s) (top_k=%d)", reranker.name, len(chunks), top_k)
        start = time.perf_counter()

        result = await reranker.rerank(query, chunks, top_k)

        elapsed = time.perf_counter() - start
        logger.info("Reranker [%s] returned %d chunk(s) in %.1fms", reranker.name, len(result), elapsed * 1000)
        return result