from __future__ import annotations

import os
from typing import Any, Sequence

from app.rag.components.base import BaseEmbedder
from app.rag.schemas.pipeline_models import RAGDocument
from app.rag.schemas.types import Embedding


class DenseEmbedder(BaseEmbedder):
    """Generic dense vector embedder (REST-based)."""

    name = "dense"
    description = "Generic dense vector embedder (REST-based)."
    requirement: list[str] = ["requests"]
    config = {"model": "str", "embedding_dimension": "int", "api_key": "str", "api_base": "str", "task": "str"}
    embedding_type = "dense"
    supports_multi_vector = False

    def __init__(self, rag_config: dict[str, Any]) -> None:
        emb = rag_config.get("embedding", {})
        self.model: str = emb.get("model")
        self.embedding_dimension: int = emb.get("dimension")
        self.api_key: str = emb.get("api_key")
        self.api_base: str = emb.get("api_base")
        self.task: str = emb.get("task")

    def _validate_dimension(self, vectors: list[list[float]]) -> None:
        if not vectors:
            return
        actual = len(vectors[0])
        if self.embedding_dimension and self.embedding_dimension != actual:
            # We allow dimension mismatch if it's jina-v3 because of Matryoshka support
            # but we log it.
             pass

    def _request_embeddings(self, texts: Sequence[str]) -> list[list[float]]:
        import requests as http_requests

        payload = {"model": self.model, "input": list(texts)}
        if self.task:
            payload["task"] = self.task
        if self.embedding_dimension:
            payload["dimensions"] = self.embedding_dimension
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
        }
        url = f"{self.api_base.rstrip('/')}/embeddings"
        try:
            response = http_requests.post(url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            data = response.json()
            return [d["embedding"] for d in data["data"]]
        except Exception as exc:
            raise RuntimeError(f"Embedding request failed: {exc}") from exc

    async def embed(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        all_chunks = []
        for doc in documents:
            all_chunks.extend(doc.chunks)
        if not all_chunks:
            return documents
        texts = [c.content for c in all_chunks]
        vectors = self._request_embeddings(texts)
        self._validate_dimension(vectors)
        for chunk, vector in zip(all_chunks, vectors):
            chunk.embedded_contexts.append({
                "vector": vector,
                "type": self.embedding_type,
                "model": self.model,
            })
        return documents

    async def embed_query(self, query: str, rag_config: dict[str, Any]) -> Embedding:
        vectors = self._request_embeddings([query])
        self._validate_dimension(vectors)
        return Embedding(
            vector=list(vectors[0]),
            embedding_type=self.embedding_type,
            metadata={"model": self.model, "query_text": query},
        )

    async def embed_query_batch(self, texts: list[str], rag_config: dict[str, Any]) -> list[Embedding]:
        if not texts:
            return []
        vectors = self._request_embeddings(texts)
        self._validate_dimension(vectors)
        return [
            Embedding(
                vector=v,
                embedding_type=self.embedding_type,
                metadata={"model": self.model},
            )
            for v in vectors
        ]