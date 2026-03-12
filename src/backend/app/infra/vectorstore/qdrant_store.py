from __future__ import annotations

import uuid
import logging
from typing import Any, Sequence

from app.core.config import PlatformSettings
from app.rag.components.base import BaseVectorStore
from app.rag.schemas.pipeline_models import RAGChunk
from app.rag.schemas.types import Embedding, RetrievedChunk

logger = logging.getLogger(__name__)

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qdrant_models
except ImportError:
    logger.warning("qdrant-client not installed, Qdrant functionality will be unavailable.")
    QdrantClient = None  # type: ignore[assignment,misc]
    qdrant_models = None  # type: ignore[assignment]


class QdrantVectorStore(BaseVectorStore):
    """
    Advanced Qdrant Vector Store supporting:
    - Named Vectors (dense, matryoshka-64/128/256, colbert)
    - Sparse Vectors
    - Query API (v1.10+) with Prefetching
    """

    name = "qdrant"
    description = "Qdrant Vector Store with Hybrid & Multi-Stage support."
    requirement = ["qdrant-client"]
    config = {"url": "str", "api_key": "str", "collection_name": "str", "vector_dimension": "int"}
    supported_embedding_types = ["dense", "hybrid", "multi_vector"]
    supports_hybrid_search = True

    def __init__(self, rag_config: dict[str, Any]) -> None:
        vs = rag_config.get("vectorstore", {})
        emb = rag_config.get("embedding", {})
        self.url: str = vs.get("url", "") or ""
        self.api_key: str = vs.get("api_key", "") or ""
        self.collection_name: str = vs.get("collection_name", "")
        self.vector_dimension: int = vs.get("vector_dimension") or emb.get("dimension", 1024)
        self._client: Any = None

    def _get_client(self) -> Any:
        if QdrantClient is None:
             raise RuntimeError("Missing dependency: qdrant-client")
        if self._client is None:
            if not self.url:
                from app.core.config import PlatformSettings
                settings = PlatformSettings()
                self.url = settings.qdrant_url
                self.api_key = settings.qdrant_api_key

            self._client = QdrantClient(url=self.url, api_key=self.api_key, timeout=60)
        return self._client

    def _ensure_collection(self, collection_name: str) -> None:
        client = self._get_client()
        if not qdrant_models: return
        
        try:
            # Check if collection exists and has named vectors
            coll = client.get_collection(collection_name=collection_name)
            # If vectors is not a dict, it's a single unnamed vector
            if not isinstance(coll.config.params.vectors, dict):
                 logger.warning("Collection [%s] exists but lacks named vectors. Recreating for multi-stage support.", collection_name)
                 client.delete_collection(collection_name=collection_name)
                 raise ValueError("ForceRecreate") 
        except Exception:
            # Create/Recreate with NAMED VECTORS for the multi-stage pipeline
            vectors_config = {
                "dense": qdrant_models.VectorParams(
                    size=self.vector_dimension, distance=qdrant_models.Distance.COSINE
                ),
                "matryoshka-64": qdrant_models.VectorParams(
                    size=64, distance=qdrant_models.Distance.COSINE
                ),
                "matryoshka-128": qdrant_models.VectorParams(
                    size=128, distance=qdrant_models.Distance.COSINE
                ),
                "matryoshka-256": qdrant_models.VectorParams(
                    size=256, distance=qdrant_models.Distance.COSINE
                ),
                "colbert": qdrant_models.VectorParams(
                    size=self.vector_dimension, # Or 128 for compressed
                    distance=qdrant_models.Distance.COSINE,
                    multivector_config=qdrant_models.MultiVectorConfig(
                        comparator=qdrant_models.MultiVectorComparator.MAX_SIM
                    ),
                    # Disable HNSW to save RAM as it's for reranking only
                    hnsw_config=qdrant_models.HnswConfigDiff(m=0, payload_m=16) 
                ),
            }
            
            client.create_collection(
                collection_name=collection_name,
                vectors_config=vectors_config,
                sparse_vectors_config={
                    "sparse": qdrant_models.SparseVectorParams(index=qdrant_models.SparseIndexParams(on_disk=True))
                },
                quantization_config=qdrant_models.ScalarQuantization(
                    scalar=qdrant_models.ScalarQuantizationConfig(
                        type=qdrant_models.ScalarType.INT8,
                        always_ram=True
                    )
                )
            )
            logger.info("Created collection [%s] with hybrid named vectors & INT8 quantization", collection_name)

    async def store_chunks(
        self, collection_name: str, chunks: list[RAGChunk], context_meta: dict[str, str],
    ) -> None:
        if not chunks or not qdrant_models: return
        client = self._get_client()
        self._ensure_collection(collection_name)
        
        points = []
        for chunk in chunks:
            # Extract main vector (1024)
            main_vec = []
            colbert_vecs = []
            
            for ctx in chunk.embedded_contexts:
                if ctx.get("type") == "dense":
                    main_vec = list(ctx["vector"])
                elif ctx.get("type") == "multi_vector":
                    colbert_vecs = list(ctx["vector"])

            if not main_vec and chunk.embedded_contexts:
                # Fallback to first one
                main_vec = list(chunk.embedded_contexts[0].get("vector", []))

            # Named vectors object
            vectors = {
                "dense": main_vec,
                "matryoshka-64": main_vec[:64] if len(main_vec) >= 64 else [],
                "matryoshka-128": main_vec[:128] if len(main_vec) >= 128 else [],
                "matryoshka-256": main_vec[:256] if len(main_vec) >= 256 else [],
            }
            if colbert_vecs:
                vectors["colbert"] = colbert_vecs
            
            # Sparse Vector (Pseudo-BM25 based on hashing for demo/testing)
            import hashlib
            chunk_tokens = chunk.content.split()
            sparse_indices = [int(hashlib.md5(t.lower().encode()).hexdigest(), 16) % 1000000 for t in chunk_tokens]
            if sparse_indices:
                unique_indices = list(set(sparse_indices))
                # Count frequencies like a naive bag of words
                freqs = [sparse_indices.count(idx) for idx in unique_indices]
                vectors["sparse"] = qdrant_models.SparseVector(
                    indices=unique_indices,
                    values=[float(f) for f in freqs]
                )
            else:
                vectors["sparse"] = qdrant_models.SparseVector(indices=[0], values=[0.0])
            
            payload = {
                "chunk_id": chunk.chunk_id,
                "text": chunk.content,
                **chunk.metadata,
                **context_meta,
            }
            points.append(qdrant_models.PointStruct(id=chunk.chunk_id, vector=vectors, payload=payload))
            
        # Batch the upsert to avoid 'payload too large' errors in Qdrant Cloud
        batch_size = 20
        for i in range(0, len(points), batch_size):
            batch = points[i : i + batch_size]
            logger.info("Upserting batch %d/%d (%d points) to Qdrant", 
                        (i // batch_size) + 1, (len(points) + batch_size - 1) // batch_size, len(batch))
            client.upsert(collection_name=collection_name, points=batch, wait=True)


    async def search(
        self, collection_name: str, query_vector: list[float], top_k: int = 10, **kwargs: Any
    ) -> list[RetrievedChunk]:
        """
        Generic search. For MultiStageRetriever, it preferes using query_points API natively.
        """
        client = self._get_client()
        if not qdrant_models: return []
        
        # We delegate the complex multi-stage prefetching to the Retriever component 
        # which will call client.query_points with the full structure.
        # But for simple calls, we handle standard search.
        
        matches = client.search(
            collection_name=collection_name,
            query_vector=qdrant_models.NamedVector(name="dense", vector=query_vector),
            limit=top_k,
            with_payload=True,
            **kwargs
        )
        return [self._to_chunk(m) for m in matches]

    def _build_filter(self, filters: dict[str, Any]) -> Any:
        from app.rag.utils.filter_translator import QdrantFilterTranslator
        return QdrantFilterTranslator.translate(filters)


    async def delete_by_filters(self, filters: dict[str, str]) -> None:
        if not qdrant_models:
            return
        client = self._get_client()
        client.delete(
            collection_name=self.collection_name,
            points_selector=qdrant_models.FilterSelector(filter=self._build_filter(filters)),
            wait=True,
        )

    async def list_by_filters(self, filters: dict[str, str]) -> list[Embedding]:
        if not qdrant_models:
            return []
        client = self._get_client()
        results: list[Embedding] = []
        next_offset = None
        while True:
            points, next_offset = client.scroll(
                collection_name=self.collection_name,
                scroll_filter=self._build_filter(filters),
                limit=256,
                offset=next_offset,
                with_payload=True,
                with_vectors=True,
            )
            for point in points:
                vector = point.vector
                # Handle named vectors
                values = list(vector["dense"]) if isinstance(vector, dict) and "dense" in vector else list(vector or [])
                results.append(
                    Embedding(
                        vector=values,
                        embedding_type="dense",
                        metadata=dict(point.payload or {}),
                    )
                )
            if next_offset is None:
                break
        return results

    def _to_chunk(self, result: Any) -> RetrievedChunk:
        payload = result.payload or {}
        return RetrievedChunk(
            chunk_id=payload.get("chunk_id", str(result.id)),
            document_id=payload.get("file_id", ""),
            document_title=payload.get("document_title", "Untitled"),
            text=payload.get("text", ""),
            score=float(result.score),
            metadata=dict(payload),
        )