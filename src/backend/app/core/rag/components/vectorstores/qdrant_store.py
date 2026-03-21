from __future__ import annotations

import uuid
from typing import Any

from app.core.rag.components.base import BaseVectorStore
from app.core.rag.pipeline_models import RAGChunk
from app.core.rag.types import Embedding, RetrievedChunk

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qdrant_models
except ImportError:
    QdrantClient = None  # type: ignore[assignment,misc]
    qdrant_models = None  # type: ignore[assignment]


class QdrantVectorStore(BaseVectorStore):
    """Qdrant Vector Store (Managed or Self-hosted)."""

    name = "qdrant"
    description = "Qdrant Vector Store (Managed or Self-hosted)."
    requires_library = ["qdrant-client"]
    config = {"url": "str", "api_key": "str", "collection_name": "str", "vector_dimension": "int"}
    supported_embedding_types = ["dense", "hybrid"]
    supports_multi_vector = False
    supports_hybrid_search = True

    def __init__(self, rag_config: dict[str, Any]) -> None:
        vs = rag_config.get("vectorstore", {})
        emb = rag_config.get("embedding", {})
        self.url: str = vs.get("url", "") or ""
        self.api_key: str = vs.get("api_key", "") or ""
        self.collection_name: str = vs.get("collection_name", "")
        self.vector_dimension: int = vs.get("vector_dimension") or emb.get("dimension", 0)
        self.retrieval_mode: str = rag_config.get("retriever", {}).get("component", "vector")
        self._client: Any = None

    def check_dependencies(self) -> None:
        if QdrantClient is None or qdrant_models is None:
            raise RuntimeError("Missing dependency: qdrant-client")

    def _get_client(self) -> Any:
        if self._client is None:
            self._client = QdrantClient(
                url=self.url, api_key=self.api_key, timeout=30, check_compatibility=False
            )
        return self._client

    def _ensure_collection(self, collection_name: str) -> None:
        client = self._get_client()
        if not qdrant_models:
            return
        try:
            client.get_collection(collection_name=collection_name)
        except Exception:
            client.create_collection(
                collection_name=collection_name,
                vectors_config=qdrant_models.VectorParams(
                    size=self.vector_dimension, distance=qdrant_models.Distance.COSINE
                ),
            )
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name="workspace_id",
                field_schema=qdrant_models.PayloadSchemaType.KEYWORD,
                wait=True,
            )
        except Exception:
            pass

    def _build_filter(self, filters: dict[str, str]) -> Any:
        if not qdrant_models:
            return None
        return qdrant_models.Filter(
            must=[
                qdrant_models.FieldCondition(
                    key=k, match=qdrant_models.MatchValue(value=v)
                )
                for k, v in filters.items()
            ]
        )

    async def store_chunks(
        self, collection_name: str, chunks: list[RAGChunk], context_meta: dict[str, str],
    ) -> None:
        if not chunks or not qdrant_models:
            return
        client = self._get_client()
        self._ensure_collection(collection_name)
        points = []
        for chunk in chunks:
            ctx = chunk.embedded_contexts[0] if chunk.embedded_contexts else {}
            vector = ctx.get("vector", []) if isinstance(ctx, dict) else []
            payload = {
                "file_id": chunk.document_id,
                "document_title": chunk.title,
                "chunk_id": chunk.chunk_id,
                "text": chunk.content,
                **chunk.metadata,
                **context_meta,
            }
            points.append(
                qdrant_models.PointStruct(id=chunk.chunk_id, vector=vector, payload=payload)
            )
        client.upsert(collection_name=collection_name, points=points, wait=True)

    def _to_chunk(self, result: Any) -> RetrievedChunk:
        payload = result.payload or {}
        return RetrievedChunk(
            chunk_id=payload.get("chunk_id", str(result.id)),
            document_id=payload.get("document_id", ""),
            document_title=payload.get("document_title", "Untitled"),
            text=payload.get("text", payload.get("chunk_text", "")),
            score=float(result.score),
            metadata=dict(payload),
        )

    async def search(
        self, collection_name: str, query_vector: list[float], top_k: int = 5, **kwargs: Any
    ) -> list[RetrievedChunk]:
        if not qdrant_models:
            return []
        client = self._get_client()
        filters = kwargs.get("filters", {})
        q_filter = self._build_filter(filters)
        try:
            if hasattr(client, "search"):
                matches = client.search(
                    collection_name=collection_name,
                    query_vector=query_vector,
                    query_filter=q_filter,
                    limit=top_k,
                    with_payload=True,
                )
            else:
                response = client.query_points(
                    collection_name=collection_name,
                    query=query_vector,
                    query_filter=q_filter,
                    limit=top_k,
                    with_payload=True,
                )
                matches = getattr(response, "points", response)
            return [self._to_chunk(m) for m in matches]
        except Exception as exc:
            raise RuntimeError(f"Qdrant search failed: {exc}") from exc

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
                values = list(next(iter(vector.values()))) if isinstance(vector, dict) else list(vector or [])
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