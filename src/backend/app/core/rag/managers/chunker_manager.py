from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.core.rag.components.base import BaseChunker
from app.core.rag.components.chunkers.simple_chunker import SimpleChunker
from app.core.rag.components.chunkers.semantic_chunker import SemanticChunker
from app.core.rag.components.chunkers.recursive_chunker import RecursiveChunker
from app.core.rag.pipeline_models import RAGDocument

logger = logging.getLogger(__name__)


class ChunkerManager:
    """Orchestrator for chunker components."""

    def __init__(self) -> None:
        self.chunkers: dict[str, Type[BaseChunker]] = {
            "simple": SimpleChunker,
            "semantic": SemanticChunker,
            "recursive": RecursiveChunker,
        }

    def available_components(self) -> list[str]:
        return list(self.chunkers.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseChunker:
        name = rag_config.get("chunking", {}).get("component", "")
        if name not in self.chunkers:
            raise ValueError(f"Chunker '{name}' not registered. Available: {list(self.chunkers.keys())}")
        component = self.chunkers[name](rag_config)
        component.check_dependencies()
        return component

    def process(
        self,
        rag_config: dict[str, Any],
        documents: list[RAGDocument],
    ) -> list[RAGDocument]:
        """Chunk all documents (populates doc.chunks) and return them."""
        chunker = self.resolve(rag_config)
        logger.info("Chunker [%s] starting for %d document(s)", chunker.name, len(documents))
        start = time.perf_counter()

        documents = chunker.chunk(documents, rag_config)

        total_chunks = sum(len(doc.chunks) for doc in documents)
        elapsed = time.perf_counter() - start
        logger.info("Chunker [%s] produced %d chunk(s) in %.1fms", chunker.name, total_chunks, elapsed * 1000)
        return documents
