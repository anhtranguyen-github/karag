from __future__ import annotations

from typing import Any

from app.rag.components.embedders.dense_embedder import DenseEmbedder


class GraphEmbedder(DenseEmbedder):
    """Graph-aware embedding strategy for relationship-rich retrieval."""

    name = "graph"
    description = "Graph-aware embedding strategy for relationship-rich retrieval."
    requirement: list[str] = []
    config = {"model": "str", "embedding_dimension": "int", "api_key": "str", "api_base": "str"}
    embedding_type = "graph"
    supports_multi_vector = False

    def __init__(self, rag_config: dict[str, Any]) -> None:
        super().__init__(rag_config)