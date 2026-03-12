from __future__ import annotations

from typing import Any

from app.rag.components.base import BaseRetriever, BaseVectorStore
from app.rag.schemas.types import Embedding, RetrievedChunk


class HybridRetriever(BaseRetriever):
    """Combines vector search and keyword search for improved recall."""

    name = "hybrid"
    description = "Retriever that combines vector search and keyword search for improved recall."
    requirement: list[str] = []
    config = {"vectorstore": "BaseVectorStore"}
    supported_embedding_types = ["dense", "hybrid"]
    supports_multi_vector_search = True

    def __init__(self, rag_config: dict[str, Any]) -> None:
        self._vectorstore: BaseVectorStore | None = None

    def set_vectorstore(self, vectorstore: BaseVectorStore) -> None:
        self._vectorstore = vectorstore



    async def retrieve(
        self, query_embedding: Embedding, top_k: int = 5, **kwargs: Any
    ) -> list[RetrievedChunk]:
        if self._vectorstore is None:
            raise RuntimeError("VectorStore not set on HybridRetriever")
        collection_name = kwargs.pop("collection_name", None)
        if not collection_name:
            raise ValueError("collection_name is required")
        return await self._vectorstore.search(
            collection_name=collection_name,
            query_vector=query_embedding.vector,
            top_k=top_k,
            hybrid=True,
            **kwargs,
        )