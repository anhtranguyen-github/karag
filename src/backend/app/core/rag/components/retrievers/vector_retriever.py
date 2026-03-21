from __future__ import annotations

from typing import Any

from app.core.rag.components.base import BaseRetriever, BaseVectorStore
from app.core.rag.types import Embedding, RetrievedChunk


class VectorRetriever(BaseRetriever):
    """Standard dense vector retriever."""

    name = "vector"
    description = "Standard dense vector retriever."
    requires_library: list[str] = []
    config = {"vectorstore": "BaseVectorStore"}
    supported_embedding_types = ["dense", "hybrid", "graph"]
    supports_multi_vector_search = False

    def __init__(self, rag_config: dict[str, Any]) -> None:
        self._vectorstore: BaseVectorStore | None = None

    def set_vectorstore(self, vectorstore: BaseVectorStore) -> None:
        self._vectorstore = vectorstore

    def check_dependencies(self) -> None:
        pass

    async def retrieve(
        self, query_embedding: Embedding, top_k: int = 5, **kwargs: Any
    ) -> list[RetrievedChunk]:
        if self._vectorstore is None:
            raise RuntimeError("VectorStore not set on VectorRetriever")
        collection_name = kwargs.pop("collection_name", None)
        if not collection_name:
            raise ValueError("collection_name is required")
        return await self._vectorstore.search(
            collection_name=collection_name,
            query_vector=query_embedding.vector,
            top_k=top_k,
            **kwargs,
        )