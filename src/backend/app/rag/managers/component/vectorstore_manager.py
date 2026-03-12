from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.rag.components.base import BaseVectorStore
from app.rag.components.base import BaseComponent
from app.infra.vectorstore.pgvector_store import PgVectorVectorStore
from app.infra.vectorstore.qdrant_store import QdrantVectorStore
from app.rag.schemas.pipeline_models import RAGDocument

logger = logging.getLogger(__name__)

class VectorStoreManager:
    """Orchestrator for vector store components."""

    def __init__(self) -> None:
        self.vectorstores: dict[str, Type[BaseVectorStore]] = {
            "qdrant": QdrantVectorStore,
            "pgvector": PgVectorVectorStore,
        }

    def available_components(self) -> list[str]:
        return list(self.vectorstores.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseVectorStore:
        name = rag_config.get("vectorstore", {}).get("component")
        if not name:
            raise ValueError("No vectorstore component specified in 'vectorstore.component' config.")
            
        if name not in self.vectorstores:
            raise ValueError(f"VectorStore '{name}' not registered. Available: {list(self.vectorstores.keys())}")
        
        # Instantiate component with config
        component = self.vectorstores[name](rag_config)
        return component

    async def persist(
        self,
        rag_config: dict[str, Any],
        documents: list[RAGDocument],
        collection_name: str,
        context_meta: dict[str, str],
    ) -> None:
        """Persist all chunks from all documents into the selected vector store."""
        vectorstore = self.resolve(rag_config)
        
        all_chunks = []
        for doc in documents:
            all_chunks.extend(doc.chunks)
            
        if not all_chunks:
            logger.warning("No chunks to persist.")
            return

        logger.info("VectorStore [%s] persisting %d chunk(s) to collection [%s]", 
                    vectorstore.name, len(all_chunks), collection_name)
        
        start = time.perf_counter()
        await vectorstore.store_chunks(collection_name, all_chunks, context_meta)
        
        elapsed = time.perf_counter() - start
        logger.info("VectorStore [%s] persisted %d chunk(s) in %.1fms", 
                    vectorstore.name, len(all_chunks), elapsed * 1000)

    async def delete_document(self, rag_config: dict[str, Any], document_id: str) -> None:
        """Helper to delete a document from the vector store."""
        vectorstore = self.resolve(rag_config)
        await vectorstore.delete_by_filters({"document_id": document_id})

    async def get_document_chunks(self, rag_config: dict[str, Any], document_id: str) -> Any:
        """Helper to fetch all chunks associated with a document."""
        vectorstore = self.resolve(rag_config)
        return await vectorstore.list_by_filters({"document_id": document_id})
