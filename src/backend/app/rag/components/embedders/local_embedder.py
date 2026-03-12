from __future__ import annotations

import hashlib
import math
import re
from typing import Any

from app.rag.components.base import BaseEmbedder
from app.rag.schemas.pipeline_models import RAGDocument
from app.rag.schemas.types import Embedding


class LocalEmbedder(BaseEmbedder):
    """Deterministic local embedder for dev/test environments."""

    name = "local"
    description = "Deterministic local embedder for development and testing."
    requirement: list[str] = []
    config = {"model": "str", "dimension": "int"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        emb = rag_config.get("embedding", {})
        self.model: str = emb.get("model", "local-deterministic")
        self.dimension: int = int(emb.get("dimension") or 256)

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r"[a-z0-9]+", text.lower())

    def _embed_text(self, text: str) -> list[float]:
        vector = [0.0] * self.dimension
        tokens = self._tokenize(text) or ["empty"]
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            bucket = int.from_bytes(digest[:4], "big") % self.dimension
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            weight = 1.0 + (digest[5] / 255.0)
            vector[bucket] += sign * weight

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]

    async def embed(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        for document in documents:
            for chunk in document.chunks:
                chunk.embedded_contexts.append(
                    {
                        "vector": self._embed_text(chunk.content),
                        "type": "dense",
                        "model": self.model,
                    }
                )
        return documents

    async def embed_query(self, query: str, rag_config: dict[str, Any]) -> Embedding:
        return Embedding(
            vector=self._embed_text(query),
            embedding_type="dense",
            metadata={"model": self.model, "query_text": query},
        )
