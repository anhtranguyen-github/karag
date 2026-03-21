from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.core.rag.components.base import BaseVectorStore
from app.core.rag.components.vectorstores.pgvector_store import PgVectorVectorStore
from app.core.rag.components.vectorstores.qdrant_store import QdrantVectorStore
from app.core.rag.types import Embedding
from app.core.rag.documents import Chunk
from app.core.rag.pipeline_models import RAGDocument

logger = logging.getLogger(__name__)


class VectorStoreManager:
    """Orchestrator for vector store components."""

    def __init__(self) -> None:
        self.vectorstores: dict[str, Type[BaseVectorStore]] = {
            "pgvector": PgVectorVectorStore,
            "qdrant": QdrantVectorStore,
        }

    def available_components(self) -> list[str]:
        return list(self.vectorstores.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseVectorStore:
        name = rag_config.get("vectorstore", {}).get("component", "")
        if name not in self.vectorstores:
            raise ValueError(f"VectorStore '{name}' not registered. Available: {list(self.vectorstores.keys())}")
        component = self.vectorstores[name](rag_config)
        component.check_dependencies()
        return component

    async def persist(
        self,
        rag_config: dict[str, Any],
        documents: list[RAGDocument],
        collection_name: str,
        context_meta: dict[str, str],
    ) -> None:
        """Delegate chunk storage to the vectorstore component."""
        store = self.resolve(rag_config)
        all_chunks = [chunk for doc in documents for chunk in doc.chunks]
        logger.info("VectorStore [%s] persisting %d chunk(s) to %s", store.name, len(all_chunks), collection_name)
        start = time.perf_counter()

        if all_chunks:
            await store.store_chunks(collection_name, all_chunks, context_meta)

        elapsed = time.perf_counter() - start
        logger.info("VectorStore [%s] persisted %d chunk(s) in %.1fms", store.name, len(all_chunks), elapsed * 1000)

    async def delete_document(self, rag_config: dict[str, Any], file_id: str) -> None:
        """Remove all chunks for a file_id from the vector store."""
        store = self.resolve(rag_config)
        await store.delete_by_filters({"file_id": file_id})
        logger.info("VectorStore [%s] deleted document %s", store.name, file_id)

    async def get_document_chunks(self, rag_config: dict[str, Any], file_id: str) -> list[Chunk]:
        """Fetch all chunks for a file_id, returning domain Chunk objects."""
        store = self.resolve(rag_config)
        embeddings = await store.list_by_filters({"file_id": file_id})
        return [
            Chunk(
                content=e.metadata.get("text", ""),
                chunk_id=e.metadata.get("chunk_id", ""),
                file_id=file_id,
            )
            for e in embeddings
        ]