from __future__ import annotations

import logging
from typing import Any, Sequence

from app.rag.components.embedders.dense_embedder import DenseEmbedder
from app.rag.schemas.pipeline_models import RAGDocument
from app.rag.schemas.types import Embedding

logger = logging.getLogger(__name__)

class MultiVectorEmbedder(DenseEmbedder):
    """
    Specialised Jina v3 Embedder for Multi-Vector / Late Interaction.
    Returns:
    - Primary Vector: Global Dense (1024-dim) for Cascade Stages 1-4.
    - Secondary Metadata: Token-level Late Interaction vectors for Stage 5.
    """

    name = "multi_vector"
    description = "Jina v3 Multi-Vector Embedder supporting Late Interaction and Matryoshka Cascade."
    requirement: list[str] = []
    config = {"model": "str", "embedding_dimension": "int", "api_key": "str", "api_base": "str", "task": "str"}
    embedding_type = "multi_vector"
    supports_multi_vector = True

    def __init__(self, rag_config: dict[str, Any]) -> None:
        super().__init__(rag_config)
        # We explicitly request dense for Cascade and late_interaction for fine ranking
        self.late_interaction = True 

    async def embed(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        """Ingestion pipeline: produce both dense and late_interaction vectors."""
        all_chunks = []
        for doc in documents:
            all_chunks.extend(doc.chunks)
        if not all_chunks:
            return documents
        
        texts = [c.content for c in all_chunks]
        
        # Jina v3 Recommendation: Call once for dense, once for late interaction
        # or use a specialized task if available. To be robust, we call both.
        logger.info("[Embedding] Batch generating Dense + LateInteraction vectors")
        
        # 1. Generate Dense (1024-dim) for Matryoshka
        dense_vectors = self._request_embeddings_simple(texts, late_interaction=False)
        
        # 2. Generate Multi-Vector (ColBERT) for Stage 5
        token_vectors = self._request_embeddings_simple(texts, late_interaction=True)
        
        for chunk, dense, token_v in zip(all_chunks, dense_vectors, token_vectors):
            # Store dense first as standard context
            chunk.embedded_contexts.append({
                "vector": dense,
                "type": "dense",
                "model": self.model,
            })
            # Store late interaction context
            chunk.embedded_contexts.append({
                "vector": token_v,
                "type": "multi_vector",
                "model": self.model,
            })
        return documents

    async def embed_query(self, query: str, rag_config: dict[str, Any]) -> Embedding:
        """Retrieval pipeline: produce both dense and late_interaction vectors."""
        # Query typically needs both for the multi-stage filter
        dense = self._request_embeddings_simple([query], late_interaction=False)[0]
        token_v = self._request_embeddings_simple([query], late_interaction=True)[0]
        
        return Embedding(
            vector=dense,
            embedding_type="dense",
            metadata={
                "model": self.model,
                "query_text": query,
                "token_vectors": token_v # Attached for Stage 5 reranking
            },
        )

    def _request_embeddings_simple(self, texts: Sequence[str], late_interaction: bool) -> list[Any]:
        import requests as http_requests
        payload = {
            "model": self.model,
            "input": list(texts),
            "late_interaction": late_interaction
        }
        if self.task:
            payload["task"] = self.task
            
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
            raise RuntimeError(f"Jina Embedding request failed (li={late_interaction}): {exc}") from exc