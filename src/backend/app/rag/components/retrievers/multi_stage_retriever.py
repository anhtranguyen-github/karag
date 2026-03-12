from __future__ import annotations

import logging
from typing import Any

from app.rag.components.base import BaseRetriever, BaseVectorStore
from app.rag.schemas.types import Embedding, RetrievedChunk

logger = logging.getLogger(__name__)

class MultiStageRetriever(BaseRetriever):
    """
    Implements a multi-stage hybrid retrieval strategy using Qdrant's Query API (v1.10+):
    1. Matryoshka Cascade (64 -> 128 -> 256)
    2. Dense & Sparse Retrieval
    3. RRF Fusion
    4. Late Interaction/ColBERT Reranking
    """

    name = "multi_stage"
    description = "Advanced multi-stage hybrid retrieval (Matryoshka + Hybrid + Rerank)."
    requirement = ["qdrant-client"]
    config = {"vectorstore": "BaseVectorStore", "final_top_k": "int"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        self._vectorstore: BaseVectorStore | None = None
        self.final_top_k = rag_config.get("retriever", {}).get("final_top_k", 10)

    def set_vectorstore(self, vectorstore: BaseVectorStore) -> None:
        self._vectorstore = vectorstore

    async def retrieve(
        self, query_embedding: Embedding, top_k: int = 10, **kwargs: Any
    ) -> list[RetrievedChunk]:
        if not self._vectorstore or not hasattr(self._vectorstore, "_get_client"):
             raise RuntimeError("VectorStore not configured or incompatible with MultiStageRetriever")

        collection_name = kwargs.pop("collection_name", None)
        if not collection_name:
            raise ValueError("collection_name is required")

        client = self._vectorstore._get_client()
        from qdrant_client import models as qdrant_models
        
        q_vec = query_embedding.vector # full 1024
        
        # --- BUILD MATRYOSHKA BRANCH ---
        # 64-dim (100) -> 128-dim (50) -> 256-dim (25)
        matryoshka_prefetch = qdrant_models.Prefetch(
            prefetch=[
                qdrant_models.Prefetch(
                    prefetch=[
                        qdrant_models.Prefetch(
                            query=q_vec[:64],
                            using="matryoshka-64",
                            limit=100,
                        )
                    ],
                    query=q_vec[:128],
                    using="matryoshka-128",
                    limit=50,
                )
            ],
            query=q_vec[:256],
            using="matryoshka-256",
            limit=25,
        )

        # --- BUILD HYBRID BRANCH (Dense + Sparse Fusion) ---
        # 1. Dense Branch (Integer -> Full)
        # Note: In Qdrant, running dense over a quantized (int8) index automatically
        # performs the integer-based lookup. Providing nested prefetch explicitly 
        # structures the 100 -> 25 rescore pipeline from the diagram.
        dense_prefetch = qdrant_models.Prefetch(
            prefetch=[
                qdrant_models.Prefetch(
                    query=q_vec,
                    using="dense",
                    limit=100,
                )
            ],
            query=q_vec,
            using="dense",  # Qdrant will use full-precision for the final rerank
            limit=25
        )

        # 2. Sparse Branch (BM25)
        # We generate a pseudo-sparse vector from the query text for demonstration.
        # In production, a dedicated SPLADE/BM25 embedder would generate this.
        import hashlib
        query_text = query_embedding.metadata.get("query_text", "")
        # Very simple hash-based bag-of-words for the sparse indices
        sparse_indices = [int(hashlib.md5(t.lower().encode()).hexdigest(), 16) % 1000000 for t in query_text.split()]
        sparse_values = [1.0] * len(sparse_indices)

        sparse_prefetch = qdrant_models.Prefetch(
            query=qdrant_models.SparseVector(
                indices=list(set(sparse_indices)), 
                values=[1.0] * len(set(sparse_indices)) if sparse_indices else [1.0]
            ) if sparse_indices else qdrant_models.SparseVector(indices=[0], values=[0.0]),
            using="sparse",
            limit=25
        )

        # 3. Fusion Branch
        hybrid_prefetch = qdrant_models.Prefetch(
            prefetch=[dense_prefetch, sparse_prefetch],
            query=qdrant_models.FusionQuery(fusion=qdrant_models.Fusion.RRF),
            limit=25
        )

        # --- FINAL STAGE: FUSION & RERANK ---
        # We use late interaction (colbert) if the embedding is multi-vector,
        # otherwise we use RRF across the branches.
        
        # NOTE: Multi-vector search requires a list of vectors.
        # If the embedder produced them (ColBERT), we rerank the prefetched candidates.
        multi_vectors = query_embedding.metadata.get("token_vectors")
        
        try:
            response = client.query_points(
                collection_name=collection_name,
                prefetch=[matryoshka_prefetch, hybrid_prefetch],
                # If we have colbert vectors, we rerank!
                query=qdrant_models.FusionQuery(fusion=qdrant_models.Fusion.RRF) 
                    if not multi_vectors else multi_vectors,
                using="dense" if not multi_vectors else "colbert",
                limit=self.final_top_k,
                with_payload=True,
            )
            matches = getattr(response, "points", response)
            return [self._vectorstore._to_chunk(m) for m in matches]
        except Exception as exc:
            logger.error(f"Multi-stage retrieval failed: {exc}")
            raise
