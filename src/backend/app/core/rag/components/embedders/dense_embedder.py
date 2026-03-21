from __future__ import annotations

from typing import Any, Sequence

from app.core.rag.components.base import BaseEmbedder
from app.core.rag.types import Embedding
from app.core.rag.pipeline_models import RAGDocument


class DenseEmbedder(BaseEmbedder):
    """Standard dense vector embedder using OpenAI-compatible APIs."""

    name = "dense"
    description = "Standard dense vector embedder using OpenAI-compatible APIs."
    requires_library = ["requests"]
    config = {"model": "str", "embedding_dimension": "int", "api_key": "str", "api_base": "str"}
    embedding_type = "dense"
    supports_multi_vector = False

    def __init__(self, rag_config: dict[str, Any]) -> None:
        embedding = rag_config.get("embedding", {})
        self.model: str = embedding.get("model", "")
        self.embedding_dimension: int = embedding.get("dimension", 0)
        self.api_key: str = embedding.get("api_key", "") or ""
        self.api_base: str = embedding.get("api_base", "") or ""

    def check_dependencies(self) -> None:
        pass

    def _validate_dimension(self, vectors: list[list[float]]) -> None:
        if not vectors or not self.embedding_dimension:
            return
        actual = len(vectors[0])
        if self.embedding_dimension != actual:
            raise ValueError(
                f"Embedder dimension mismatch: configured={self.embedding_dimension}, actual={actual}"
            )

    def _request_embeddings(self, texts: Sequence[str]) -> list[list[float]]:
        import requests as http_requests

        payload = {"model": self.model, "input": list(texts)}
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
        }
        url = f"{self.api_base.rstrip('/')}/embeddings"
        try:
            response = http_requests.post(url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            body = response.json()
            return [list(item.get("embedding", [])) for item in body.get("data", [])]
        except Exception as exc:
            raise RuntimeError(f"Embedding request failed: {exc}") from exc

    async def embed(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        all_chunks = [chunk for doc in documents for chunk in doc.chunks]
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