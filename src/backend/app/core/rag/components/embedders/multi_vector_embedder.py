from __future__ import annotations

from typing import Any

from app.core.rag.components.embedders.dense_embedder import DenseEmbedder


class MultiVectorEmbedder(DenseEmbedder):
    """Specialised embedder for multi-vector strategies (ColBERT-like)."""

    name = "multi_vector"
    description = "Specialized embedder for multi-vector strategies (ColBERT-like)."
    requires_library: list[str] = []
    config = {"model": "str", "embedding_dimension": "int", "api_key": "str", "api_base": "str"}
    embedding_type = "multi_vector"
    supports_multi_vector = True

    def __init__(self, rag_config: dict[str, Any]) -> None:
        super().__init__(rag_config)