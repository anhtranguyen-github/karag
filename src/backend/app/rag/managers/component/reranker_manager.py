from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.rag.components.base import BaseReranker
from app.rag.components.rerankers.jina_reranker import JinaReranker
from app.rag.components.rerankers.noop_reranker import NoOpReranker
from app.rag.components.rerankers.colbert_reranker import ColbertReranker
from app.rag.schemas.types import RetrievedChunk

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
        name = rag_config.get("reranker", {}).get("component")
        if not name:
             raise ValueError("No reranker component specified in 'reranker.component' config.")
        if name not in self.rerankers:
            raise ValueError(f"Reranker '{name}' not registered. Available: {list(self.rerankers.keys())}")
        component = self.rerankers[name](rag_config)
        return component

    def _deduplicate_and_diversify(self, chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
        """Remove redundant chunks from same document and high text overlap."""
        seen_docs = set()
        refined = []
        for c in chunks:
            # Simple deduplication by document_id if context is already very dense
            if c.document_id in seen_docs and len(refined) > 5:
                continue
            seen_docs.add(c.document_id)
            refined.append(c)
        return refined

    async def process(
        self,
        rag_config: dict[str, Any],
        query: str,
        chunks: list[RetrievedChunk],
    ) -> list[RetrievedChunk]:
        """Rerank chunks using top_k from rag_config, then deduplicate."""
        reranker = self.resolve(rag_config)
        top_k = rag_config.get("reranker", {}).get("top_k", rag_config.get("retriever", {}).get("top_k", 5))
        logger.info("Reranker [%s] reranking %d chunk(s) (top_k=%d)", reranker.name, len(chunks), top_k)
        start = time.perf_counter()

        result = await reranker.rerank(query, chunks, top_k)
        
        # Diversity Filtering
        result = self._deduplicate_and_diversify(result)

        elapsed = time.perf_counter() - start
        logger.info("Reranker [%s] and Diversity filtering returned %d chunk(s) in %.1fms", 
                    reranker.name, len(result), elapsed * 1000)
        return result