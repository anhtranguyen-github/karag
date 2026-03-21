from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.core.rag.components.base import BaseEmbedder
from app.core.rag.components.embedders.dense_embedder import DenseEmbedder
from app.core.rag.components.embedders.graph_embedder import GraphEmbedder
from app.core.rag.components.embedders.multi_vector_embedder import MultiVectorEmbedder
from app.core.rag.types import Embedding
from app.core.rag.pipeline_models import RAGDocument

logger = logging.getLogger(__name__)


class EmbedderManager:
    """Orchestrator for embedder components."""

    def __init__(self) -> None:
        self.embedders: dict[str, Type[BaseEmbedder]] = {
            "dense": DenseEmbedder,
            "multi_vector": MultiVectorEmbedder,
            "graph": GraphEmbedder,
        }

    def available_components(self) -> list[str]:
        return list(self.embedders.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseEmbedder:
        name = rag_config.get("embedding", {}).get("component", "")
        if name not in self.embedders:
            raise ValueError(f"Embedder '{name}' not registered. Available: {list(self.embedders.keys())}")
        component = self.embedders[name](rag_config)
        component.check_dependencies()
        return component

    async def process(
        self,
        rag_config: dict[str, Any],
        documents: list[RAGDocument],
    ) -> list[RAGDocument]:
        """Embed all chunks in all documents (populates embedded_contexts) and return them."""
        embedder = self.resolve(rag_config)
        total_chunks = sum(len(doc.chunks) for doc in documents)
        logger.info("Embedder [%s] starting for %d chunk(s)", embedder.name, total_chunks)
        start = time.perf_counter()

        documents = await embedder.embed(documents, rag_config)

        elapsed = time.perf_counter() - start
        logger.info("Embedder [%s] embedded %d chunk(s) in %.1fms", embedder.name, total_chunks, elapsed * 1000)
        return documents

    async def embed_query(self, rag_config: dict[str, Any], query: str) -> Embedding:
        """Embed a single query string."""
        embedder = self.resolve(rag_config)
        return await embedder.embed_query(query, rag_config)