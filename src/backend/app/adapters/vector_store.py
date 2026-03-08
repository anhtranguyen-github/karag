from __future__ import annotations

from collections import defaultdict
from math import sqrt
from typing import Any, Sequence

from app.core.ports import StoredVector, VectorSearchResult, VectorStore

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qdrant_models
except ImportError:  # pragma: no cover - dependency injected at runtime
    QdrantClient = None
    qdrant_models = None


def _cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    left_norm = sqrt(sum(value * value for value in left))
    right_norm = sqrt(sum(value * value for value in right))
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    numerator = sum(left_value * right_value for left_value, right_value in zip(left, right))
    return numerator / (left_norm * right_norm)


class _MemoryVectorStore(VectorStore):
    def __init__(self, name: str) -> None:
        self.name = name
        self._collections: dict[str, dict[str, StoredVector]] = defaultdict(dict)

    def upsert_embeddings(
        self,
        collection: str,
        records: Sequence[StoredVector],
    ) -> None:
        for record in records:
            self._collections[collection][record.id] = record

    def search(
        self,
        collection: str,
        query: str,
        filters: dict[str, str],
        limit: int = 5,
        query_vector: list[float] | None = None,
    ) -> list[VectorSearchResult]:
        results: list[VectorSearchResult] = []
        query_tokens = {token for token in query.lower().split() if token}
        for record in self._collections[collection].values():
            if any(record.payload.get(key) != value for key, value in filters.items()):
                continue
            if query_vector is not None:
                score = _cosine_similarity(query_vector, record.values)
                if score <= 0:
                    continue
            else:
                haystack = str(record.payload.get("chunk_text", "")).lower().split()
                overlap = len(query_tokens.intersection(haystack))
                if overlap == 0 and query_tokens:
                    continue
                score = float(overlap or 1)
            results.append(VectorSearchResult(id=record.id, score=score, payload=record.payload))
        results.sort(key=lambda item: item.score, reverse=True)
        return results[:limit]

    def delete_by_filters(self, collection: str, filters: dict[str, str]) -> None:
        deletions = [
            vector_id
            for vector_id, record in self._collections[collection].items()
            if all(record.payload.get(key) == value for key, value in filters.items())
        ]
        for vector_id in deletions:
            self._collections[collection].pop(vector_id, None)

    def list_by_filters(self, collection: str, filters: dict[str, str]) -> list[StoredVector]:
        return [
            record
            for record in self._collections[collection].values()
            if all(record.payload.get(key) == value for key, value in filters.items())
        ]


class QdrantVectorStore(_MemoryVectorStore):
    def __init__(self, url: str | None = None, api_key: str | None = None) -> None:
        super().__init__("qdrant")
        self._client: QdrantClient | None = None
        if url and QdrantClient and qdrant_models:
            try:
                self._client = QdrantClient(
                    url=url,
                    api_key=api_key,
                    timeout=30,
                    check_compatibility=False,
                )
                self._client.get_collections()
            except Exception:
                self._client = None

    def _ensure_collection(self, collection: str, vector_size: int) -> None:
        if not self._client or not qdrant_models:
            return
        try:
            self._client.get_collection(collection_name=collection)
        except Exception:
            self._client.create_collection(
                collection_name=collection,
                vectors_config=qdrant_models.VectorParams(
                    size=vector_size,
                    distance=qdrant_models.Distance.COSINE,
                ),
            )

    @staticmethod
    def _build_filter(filters: dict[str, str]):
        if not qdrant_models:
            return None
        return qdrant_models.Filter(
            must=[
                qdrant_models.FieldCondition(
                    key=key,
                    match=qdrant_models.MatchValue(value=value),
                )
                for key, value in filters.items()
            ]
        )

    def upsert_embeddings(
        self,
        collection: str,
        records: Sequence[StoredVector],
    ) -> None:
        super().upsert_embeddings(collection, records)
        if not self._client or not records or not qdrant_models:
            return
        self._ensure_collection(collection, len(records[0].values))
        points = [
            qdrant_models.PointStruct(
                id=record.id,
                vector=record.values,
                payload=record.payload,
            )
            for record in records
        ]
        self._client.upsert(collection_name=collection, points=points, wait=True)

    def search(
        self,
        collection: str,
        query: str,
        filters: dict[str, str],
        limit: int = 5,
        query_vector: list[float] | None = None,
    ) -> list[VectorSearchResult]:
        if not self._client or not qdrant_models:
            return super().search(
                collection,
                query,
                filters,
                limit=limit,
                query_vector=query_vector,
            )
        if query_vector is None:
            return super().search(collection, query, filters, limit=limit, query_vector=None)
        try:
            matches = self._client.search(
                collection_name=collection,
                query_vector=query_vector,
                query_filter=self._build_filter(filters),
                limit=limit,
                with_payload=True,
            )
        except Exception:
            return super().search(
                collection,
                query,
                filters,
                limit=limit,
                query_vector=query_vector,
            )
        return [
            VectorSearchResult(
                id=str(match.id),
                score=float(match.score or 0.0),
                payload=dict(match.payload or {}),
            )
            for match in matches
        ]

    def delete_by_filters(self, collection: str, filters: dict[str, str]) -> None:
        super().delete_by_filters(collection, filters)
        if not self._client or not qdrant_models:
            return
        try:
            self._client.delete(
                collection_name=collection,
                points_selector=qdrant_models.FilterSelector(
                    filter=self._build_filter(filters),
                ),
                wait=True,
            )
        except Exception:
            return

    def list_by_filters(self, collection: str, filters: dict[str, str]) -> list[StoredVector]:
        if not self._client or not qdrant_models:
            return super().list_by_filters(collection, filters)
        results: list[StoredVector] = []
        next_offset: Any | None = None
        while True:
            try:
                points, next_offset = self._client.scroll(
                    collection_name=collection,
                    scroll_filter=self._build_filter(filters),
                    limit=256,
                    offset=next_offset,
                    with_payload=True,
                    with_vectors=True,
                )
            except Exception:
                return super().list_by_filters(collection, filters)
            for point in points:
                vector = point.vector
                if isinstance(vector, dict):
                    values = list(next(iter(vector.values())))
                else:
                    values = list(vector or [])
                results.append(
                    StoredVector(
                        id=str(point.id),
                        values=values,
                        payload=dict(point.payload or {}),
                    )
                )
            if next_offset is None:
                break
        return results


class PineconeVectorStore(_MemoryVectorStore):
    def __init__(self) -> None:
        super().__init__("pinecone")


class WeaviateVectorStore(_MemoryVectorStore):
    def __init__(self) -> None:
        super().__init__("weaviate")


class MilvusVectorStore(_MemoryVectorStore):
    def __init__(self) -> None:
        super().__init__("milvus")
