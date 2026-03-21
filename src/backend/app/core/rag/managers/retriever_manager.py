from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.core.rag.components.base import BaseRetriever
from app.core.rag.components.retrievers.hybrid_retriever import HybridRetriever
from app.core.rag.components.retrievers.vector_retriever import VectorRetriever
from app.core.rag.types import Embedding, RetrievedChunk
from app.core.rag.managers.vectorstore_manager import VectorStoreManager

logger = logging.getLogger(__name__)


class RetrieverManager:
    """Orchestrator for retriever components."""

    def __init__(self, vectorstores: VectorStoreManager | None = None) -> None:
        self.retrievers: dict[str, Type[BaseRetriever]] = {
            "hybrid": HybridRetriever,
            "vector": VectorRetriever,
        }
        self._vectorstores = vectorstores

    def available_components(self) -> list[str]:
        return list(self.retrievers.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseRetriever:
        name = rag_config.get("retriever", {}).get("component", "")
        if name not in self.retrievers:
            raise ValueError(f"Retriever '{name}' not registered. Available: {list(self.retrievers.keys())}")
        component = self.retrievers[name](rag_config)
        component.check_dependencies()
        return component

    async def process(
        self,
        rag_config: dict[str, Any],
        query_embedding: Embedding,
        collection_name: str,
        filters: dict[str, str],
        top_k: int,
    ) -> list[RetrievedChunk]:
        """Resolve vectorstore, inject into retriever, retrieve, apply score_threshold."""
        retriever = self.resolve(rag_config)
        vectorstore = self._vectorstores.resolve(rag_config)
        retriever.set_vectorstore(vectorstore)

        logger.info("Retriever [%s] searching (top_k=%d)", retriever.name, top_k)
        start = time.perf_counter()

        chunks = await retriever.retrieve(
            query_embedding,
            top_k=top_k,
            collection_name=collection_name,
            filters=filters,
        )

        # Apply score_threshold from config
        score_threshold = rag_config.get("retriever", {}).get("score_threshold", 0.0)
        if score_threshold:
            chunks = [c for c in chunks if c.score >= score_threshold]

        elapsed = time.perf_counter() - start
        logger.info("Retriever [%s] returned %d chunk(s) in %.1fms", retriever.name, len(chunks), elapsed * 1000)
        return chunks