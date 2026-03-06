import time
from typing import List, Optional, Any, Dict

import structlog
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from backend.app.core.config import karag_settings
from backend.app.core.telemetry import get_tracer, VECTOR_STORE_LATENCY

from backend.app.schemas.database import IngestionConfig
from backend.app.schemas.retrieval import RetrievalConfig
from backend.app.rag.store.base import VectorStore, DocumentPoint, SearchResult

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class QdrantStore(VectorStore):
    def __init__(self):
        client_kwargs = {"url": karag_settings.QDRANT_URL, "timeout": 60.0}
        self._collection_cache = {}
        if karag_settings.QDRANT_API_KEY:
            client_kwargs["api_key"] = karag_settings.QDRANT_API_KEY
            if karag_settings.QDRANT_URL.startswith("http://"):
                logger.warn(
                    "qdrant_insecure_connection",
                    msg="Using API key over unencrypted HTTP. Not recommended for production.",
                )
        self.client = AsyncQdrantClient(**client_kwargs)

    async def get_document_chunks(
        self, config: IngestionConfig, doc_id: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        collection_name = (
            config.collection_name_override or f"knowledge_base_{config.vector_size}"
        )
        workspace_id = config.workspace_id
        collection_name = await self._get_effective_collection(
            collection_name, workspace_id
        )

        results = await self.client.scroll(
            collection_name=collection_name,
            scroll_filter={"must": [{"key": "doc_id", "match": {"value": doc_id}}]},
            limit=limit,
            with_payload=True,
            with_vectors=False,
        )
        return [{"id": str(p.id), **p.payload} for p in results[0]]

    async def purge_documents(self, doc_ids: List[str]) -> None:
        """Completely purge all vectors for the given document IDs across all logical collections."""
        for dim in [384, 512, 768, 896, 1024, 1536, 1792, 3072]:
            coll = f"knowledge_base_{dim}"
            if await self.client.collection_exists(coll):
                await self.client.delete(
                    collection_name=coll,
                    points_selector=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="doc_id",
                                match=qmodels.MatchAny(any=doc_ids),
                            )
                        ]
                    ),
                )

    async def purge_workspace(self, workspace_id: str) -> None:
        """Completely purge all vectors for the given workspace across global collections."""
        # Also clean up the main static collections
        for dim in [384, 512, 768, 896, 1024, 1536, 1792, 3072]:
            coll = f"knowledge_base_{dim}"
            if await self.client.collection_exists(coll):
                await self.client.delete(
                    collection_name=coll,
                    points_selector=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="workspace_id",
                                match=qmodels.MatchValue(value=workspace_id),
                            )
                        ]
                    ),
                )

        # Then clean up a specific workspace collection if it exists
        if await self.client.collection_exists(workspace_id):
            await self.client.delete_collection(workspace_id)

    async def get_system_info(self) -> Dict[str, Any]:
        """Get global status of the vector store."""
        try:
            info = await self.client.get_collections()
            collections = []
            total_points = 0
            for c in info.collections:
                details = await self.client.get_collection(c.name)
                points = details.points_count or 0
                total_points += points
                collections.append(
                    {
                        "name": c.name,
                        "status": details.status,
                        "points_count": points,
                    }
                )
            return {
                "status": "online",
                "total_collections": len(collections),
                "total_points": total_points,
                "collections": collections,
            }
        except Exception as e:
            return {"status": "offline", "error": str(e)}

    def _get_collection_name(
        self,
        config: IngestionConfig | RetrievalConfig,
        workspace_id: Optional[str] = None,
    ) -> str:
        if isinstance(config, IngestionConfig):
            if config.collection_name_override:
                return config.collection_name_override
            return f"knowledge_base_{config.vector_size}"
        else:
            # We assume RetrievalConfig will match the current logic for retrieval based on settings?
            # Actually, the base class has a separation of concerns, retrieval doesn't know the vector size inherently unless it gets it from DB or settings.
            # We'll just hardcode 1536 for now if not supplied, or we can fetch it. Let's make the wrapper handle retrieving the right dim.
            pass
        return "knowledge_base_1536"  # Default placeholder, we will refine this below

    async def _collection_exists_cached(self, name: str) -> bool:
        if name in self._collection_cache:
            return self._collection_cache[name]
        exists = await self.client.collection_exists(name)
        self._collection_cache[name] = exists
        return exists

    async def _get_effective_collection(
        self, desired_collection: str, workspace_id: Optional[str] = None
    ) -> str:
        if await self._collection_exists_cached(desired_collection):
            return desired_collection

        if workspace_id and await self._collection_exists_cached(workspace_id):
            return workspace_id

        for dim in [384, 512, 768, 896, 1024, 1536, 1792, 3072]:
            c = f"knowledge_base_{dim}"
            if await self._collection_exists_cached(c):
                return c
        return desired_collection

    async def create_collection_if_not_exists(self, config: IngestionConfig) -> bool:
        collection_name = (
            config.collection_name_override or f"knowledge_base_{config.vector_size}"
        )
        created = False
        with tracer.start_as_current_span(
            "qdrant.create_collection",
            attributes={
                "qdrant.collection": collection_name,
                "qdrant.vector_size": config.vector_size,
            },
        ):
            try:
                if not await self.client.collection_exists(collection_name):
                    vectors_config = qmodels.VectorParams(
                        size=config.vector_size,
                        distance=qmodels.Distance.COSINE,
                        on_disk=True,
                    )

                    # Sparse Vector Config (for future expansion)
                    sparse_vectors_config = None
                    if config.sparse_enabled:
                        sparse_vectors_config = {
                            "sparse": qmodels.SparseVectorParams(
                                modifier=qmodels.Modifier.NONE
                            )
                        }

                    try:
                        await self.client.create_collection(
                            collection_name=collection_name,
                            vectors_config=vectors_config,
                            sparse_vectors_config=sparse_vectors_config,
                            optimizers_config=qmodels.OptimizersConfigDiff(
                                indexing_threshold=10000,
                            ),
                        )
                        created = True
                    except Exception as e:
                        if "already exists" in str(e).lower() or "409" in str(e):
                            logger.info(
                                "qdrant_collection_exists_race",
                                collection=collection_name,
                            )
                        else:
                            raise e
                    logger.info(
                        "qdrant_collection_created",
                        collection=collection_name,
                        vector_size=config.vector_size,
                    )

                # Always ensure indices exist (idempotent in most cases, but we handle errors)
                # This ensures that even if collection was created by old code, new indices are added
                try:
                    await self.client.create_payload_index(
                        collection_name=collection_name,
                        field_name="text",
                        field_schema=qmodels.TextIndexParams(
                            type="text",
                            tokenizer=qmodels.TokenizerType.WORD,
                            min_token_len=2,
                            max_token_len=20,
                            lowercase=True,
                        ),
                    )
                except Exception as e:
                    if "already indexed" not in str(e).lower():
                        logger.debug(
                            "qdrant_index_failed_or_exists", field="text", error=str(e)
                        )

                for keyword_field in [
                    "doc_id",
                    "workspace_id",
                    "shared_with",
                    "source",
                ]:
                    try:
                        await self.client.create_payload_index(
                            collection_name=collection_name,
                            field_name=keyword_field,
                            field_schema=qmodels.PayloadSchemaType.KEYWORD,
                        )
                    except Exception as e:
                        if "already indexed" not in str(e).lower():
                            logger.debug(
                                "qdrant_index_failed_or_exists",
                                field=keyword_field,
                                error=str(e),
                            )

                return created
            except Exception as e:
                if "forbidden" in str(e).lower() or "403" in str(e):
                    logger.warn(
                        "qdrant_permission_denied",
                        msg="Forbidden to check/create collection. Assuming it already exists.",
                        collection=collection_name,
                        error=str(e),
                    )
                    return False
                raise e

    async def upsert_documents(
        self, config: IngestionConfig, points: List[DocumentPoint]
    ) -> bool:
        collection_name = (
            config.collection_name_override or f"knowledge_base_{config.vector_size}"
        )

        qdrant_points = []
        for p in points:
            q_point = qmodels.PointStruct(
                id=p.id,
                vector=p.vector,  # We only deal with dense vector directly here for now
                payload=p.payload,
            )
            qdrant_points.append(q_point)

        batch_size = 100
        for i in range(0, len(qdrant_points), batch_size):
            batch = qdrant_points[i : i + batch_size]
            await self.client.upsert(
                collection_name=collection_name,
                points=batch,
                wait=True,
            )
        return True

    async def search(
        self,
        config: RetrievalConfig,
        query_vector: List[float],
        query_text: str,
        workspace_id: str,
        collection_name: Optional[str] = None,
    ) -> List[SearchResult]:
        # Determine collection name based on vector dimension if not provided
        if not collection_name:
            dim = len(query_vector)
            collection_name = await self._get_effective_collection(
                f"knowledge_base_{dim}", workspace_id
            )

        limit = config.hybrid.top_k if config.hybrid.enabled else config.vector.top_k

        with tracer.start_as_current_span(
            "qdrant.search",
            attributes={
                "qdrant.collection": collection_name,
                "qdrant.limit": limit,
                "workspace_id": workspace_id or "",
            },
        ) as span:
            start = time.perf_counter()

            # Define Workspace Filter
            filter_query = qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="workspace_id",
                        match=qmodels.MatchValue(value=workspace_id),
                    )
                ]
            )

            # 1. Vector Search (Semantic)
            response = await self.client.query_points(
                collection_name=collection_name,
                query=query_vector,
                query_filter=filter_query,
                limit=limit * 2,
                with_payload=True,
            )
            vector_results = response.points

            # 2. Text Search (Keyword/Exact)
            text_filter = filter_query
            if not text_filter.must:
                text_filter.must = []

            text_filter.must.append(
                qmodels.FieldCondition(
                    key="text", match=qmodels.MatchText(text=query_text)
                )
            )

            text_results_response = await self.client.scroll(
                collection_name=collection_name,
                scroll_filter=text_filter,
                limit=limit * 2,
                with_payload=True,
            )
            text_results = text_results_response[0]

            duration = time.perf_counter() - start
            VECTOR_STORE_LATENCY.labels(
                operation="search", collection=collection_name
            ).observe(duration)

            span.set_attribute("qdrant.vector_hits", len(vector_results))
            span.set_attribute("qdrant.text_hits", len(text_results))
            span.set_attribute("qdrant.duration_ms", round(duration * 1000, 2))

            # Combine using basic manual RRF
            return self._fuse_results(vector_results, text_results, limit)

    def _fuse_results(self, vector_hits, text_hits, limit, k=60) -> List[SearchResult]:
        scores = {}
        payload_map = {}

        for rank, hit in enumerate(vector_hits):
            scores[hit.id] = scores.get(hit.id, 0) + 1.0 / (k + rank + 1)
            payload_map[hit.id] = hit.payload

        for rank, hit in enumerate(text_hits):
            scores[hit.id] = scores.get(hit.id, 0) + 1.0 / (k + rank + 1)
            if hit.id not in payload_map:
                payload_map[hit.id] = hit.payload

        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

        return [
            SearchResult(
                id=str(doc_id), payload=payload_map[doc_id], score=scores[doc_id]
            )
            for doc_id in sorted_ids[:limit]
        ]

    async def delete_document(self, config: IngestionConfig, doc_id: str) -> bool:
        collection_name = (
            config.collection_name_override or f"knowledge_base_{config.vector_size}"
        )
        workspace_id = config.workspace_id

        with tracer.start_as_current_span(
            "qdrant.delete_document",
            attributes={
                "doc_id": doc_id,
                "workspace_id": workspace_id or "",
            },
        ) as span:
            start = time.perf_counter()

            if workspace_id:
                collection_name = await self._get_effective_collection(
                    collection_name, workspace_id
                )
                await self.client.delete(
                    collection_name=collection_name,
                    points_selector=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="doc_id",
                                match=qmodels.MatchValue(value=doc_id),
                            ),
                            qmodels.FieldCondition(
                                key="workspace_id",
                                match=qmodels.MatchValue(value=workspace_id),
                            ),
                        ]
                    ),
                )
            else:
                for dim in [384, 512, 768, 896, 1024, 1536, 1792, 3072]:
                    c = f"knowledge_base_{dim}"
                    if await self.client.collection_exists(c):
                        await self.client.delete(
                            collection_name=c,
                            points_selector=qmodels.Filter(
                                must=[
                                    qmodels.FieldCondition(
                                        key="doc_id",
                                        match=qmodels.MatchValue(value=doc_id),
                                    )
                                ]
                            ),
                        )

            duration = time.perf_counter() - start
            span.set_attribute("qdrant.duration_ms", round(duration * 1000, 2))
            return True

    async def list_documents(self, config: IngestionConfig) -> List[Dict[str, Any]]:
        collection_name = (
            config.collection_name_override or f"knowledge_base_{config.vector_size}"
        )
        workspace_id = config.workspace_id

        collection_name = await self._get_effective_collection(
            collection_name, workspace_id
        )

        filter_query = qmodels.Filter(
            must=[
                qmodels.FieldCondition(
                    key="workspace_id",
                    match=qmodels.MatchValue(value=workspace_id),
                )
            ]
        )

        with tracer.start_as_current_span(
            "qdrant.list_documents",
            attributes={
                "qdrant.collection": collection_name,
                "workspace_id": workspace_id or "",
            },
        ):
            response = await self.client.scroll(
                collection_name=collection_name,
                scroll_filter=filter_query,
                limit=10000,
                with_payload=True,
                with_vectors=False,
            )

            docs = {}
            for point in response[0]:
                source = point.payload.get("source")
                if source and source not in docs:
                    docs[source] = {
                        "name": source,
                        "extension": point.payload.get("extension", "unknown"),
                        "chunks": 0,
                        "shared": point.payload.get("workspace_id") != workspace_id
                        if workspace_id
                        else False,
                    }
                if source:
                    docs[source]["chunks"] += 1

            return list(docs.values())

    async def get_document_content(self, config: IngestionConfig, doc_id: str) -> str:
        collection_name = (
            config.collection_name_override or f"knowledge_base_{config.vector_size}"
        )
        workspace_id = config.workspace_id
        collection_name = await self._get_effective_collection(
            collection_name, workspace_id
        )

        with tracer.start_as_current_span("qdrant.get_document_content"):
            filters = [
                qmodels.FieldCondition(
                    key="doc_id", match=qmodels.MatchValue(value=doc_id)
                )
            ]
            if workspace_id:
                filters.append(
                    qmodels.FieldCondition(
                        key="workspace_id", match=qmodels.MatchValue(value=workspace_id)
                    )
                )

            # Get chunks sorted by internal ID logic if chunk_index present
            chunks = []
            offset = None
            while True:
                response = await self.client.scroll(
                    collection_name=collection_name,
                    scroll_filter=qmodels.Filter(must=filters),
                    limit=100,
                    offset=offset,
                    with_payload=True,
                    with_vectors=False,
                )
                points = response[0]
                offset = response[1]
                for p in points:
                    chunks.append(
                        (p.payload.get("index", 0), p.payload.get("text", ""))
                    )
                if not offset:
                    break

            chunks.sort(key=lambda x: x[0])
            return "\n\n".join([c[1] for c in chunks])

    async def get_document_centroids(
        self, config: IngestionConfig
    ) -> List[Dict[str, Any]]:
        collection_name = (
            config.collection_name_override or f"knowledge_base_{config.vector_size}"
        )
        workspace_id = config.workspace_id
        collection_name = await self._get_effective_collection(
            collection_name, workspace_id
        )

        with tracer.start_as_current_span("qdrant.get_document_centroids"):
            # Scroll to get vectors
            filter_query = qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="workspace_id", match=qmodels.MatchValue(value=workspace_id)
                    )
                ]
            )

            # Not fully optimized but reproduces current behavior
            doc_data = {}
            offset = None
            while True:
                response = await self.client.scroll(
                    collection_name=collection_name,
                    scroll_filter=filter_query,
                    limit=100,
                    offset=offset,
                    with_payload=True,
                    with_vectors=True,
                )
                points = response[0]
                offset = response[1]

                for p in points:
                    source = p.payload.get("source")
                    if not source:
                        continue
                    if source not in doc_data:
                        doc_data[source] = {"vectors": [], "payload": p.payload}
                    doc_data[source]["vectors"].append(p.vector)

                if not offset:
                    break

            results = []
            for source, data in doc_data.items():
                vectors = data["vectors"]
                if not vectors:
                    continue
                num_dims = len(vectors[0])
                centroid = [0.0] * num_dims
                for vec in vectors:
                    for i in range(num_dims):
                        centroid[i] += vec[i]
                centroid = [val / len(vectors) for val in centroid]

                results.append(
                    {
                        "source": source,
                        "centroid": centroid,
                        "tags": data["payload"].get("tags", []),
                        "title": data["payload"].get("title", source),
                    }
                )

            return results

    async def sync_shared_with(
        self, config: IngestionConfig, doc_id: str, shared_with: List[str]
    ) -> bool:
        collection_name = (
            config.collection_name_override or f"knowledge_base_{config.vector_size}"
        )
        workspace_id = config.workspace_id
        collection_name = await self._get_effective_collection(
            collection_name, workspace_id
        )

        with tracer.start_as_current_span("qdrant.sync_shared_with"):
            await self.client.set_payload(
                collection_name=collection_name,
                payload={"shared_with": shared_with},
                points=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(
                            key="doc_id", match=qmodels.MatchValue(value=doc_id)
                        )
                    ]
                ),
            )
            return True
