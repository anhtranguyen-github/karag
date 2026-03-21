from __future__ import annotations

import json
import uuid
from typing import Any

from app.core.rag.components.base import BaseVectorStore
from app.core.rag.pipeline_models import RAGChunk
from app.core.rag.types import Embedding, RetrievedChunk

try:
    import psycopg
except ImportError:
    psycopg = None  # noqa: N816


class PgVectorVectorStore(BaseVectorStore):
    """PostgreSQL Vector Store (using pgvector extension)."""

    name = "pgvector"
    description = "PostgreSQL Vector Store (using pgvector extension)."
    requires_library = ["psycopg"]
    config = {"url": "str", "collection_name": "str", "vector_dimension": "int"}
    supported_embedding_types = ["dense"]
    supports_multi_vector = False
    supports_hybrid_search = False

    def __init__(self, rag_config: dict[str, Any]) -> None:
        vs = rag_config.get("vectorstore", {})
        emb = rag_config.get("embedding", {})
        self.url: str = vs.get("url", "") or ""
        self.api_key: str = vs.get("api_key", "") or ""
        self.collection_name: str = vs.get("collection_name", "")
        self.vector_dimension: int = vs.get("vector_dimension") or emb.get("dimension", 0)
        self.retrieval_mode: str = rag_config.get("retriever", {}).get("component", "vector")
        self._initialised = False

    def check_dependencies(self) -> None:
        if psycopg is None:
            raise RuntimeError("Missing dependency: psycopg")

    def _ensure_table(self, collection_name: str) -> None:
        if not psycopg or not self.url:
            return
        with psycopg.connect(self.url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "CREATE TABLE IF NOT EXISTS karag_pgvector_embeddings ("
                    "collection_name TEXT NOT NULL, "
                    "vector_id TEXT NOT NULL, "
                    "embedding DOUBLE PRECISION[] NOT NULL, "
                    "payload JSONB NOT NULL DEFAULT '{}'::jsonb, "
                    "PRIMARY KEY (collection_name, vector_id))"
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_karag_pgvector_embeddings_collection "
                    "ON karag_pgvector_embeddings (collection_name)"
                )

    def _build_filter_clause(self, collection_name: str, filters: dict[str, str]) -> tuple[str, list[Any]]:
        clauses = ["collection_name = %s"]
        params: list[Any] = [collection_name]
        for key, value in filters.items():
            clauses.append("payload ->> %s = %s")
            params.extend([key, value])
        return " AND ".join(clauses), params

    async def store_chunks(
        self, collection_name: str, chunks: list[RAGChunk], context_meta: dict[str, str],
    ) -> None:
        if not chunks or not psycopg:
            return
        self._ensure_table(collection_name)
        query = (
            "INSERT INTO karag_pgvector_embeddings (collection_name, vector_id, embedding, payload) "
            "VALUES (%s, %s, %s, %s::jsonb) "
            "ON CONFLICT (collection_name, vector_id) DO UPDATE "
            "SET embedding = EXCLUDED.embedding, payload = EXCLUDED.payload"
        )
        rows = []
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
            rows.append((collection_name, chunk.chunk_id, vector, json.dumps(payload)))
        with psycopg.connect(self.url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.executemany(query, rows)

    async def search(
        self, collection_name: str, query_vector: list[float], top_k: int = 5, **kwargs: Any
    ) -> list[RetrievedChunk]:
        if not psycopg:
            return []
        self._ensure_table(collection_name)
        filters = kwargs.get("filters", {})
        clause, params = self._build_filter_clause(collection_name, filters)
        sql = f"SELECT vector_id, embedding, payload FROM karag_pgvector_embeddings WHERE {clause}"
        try:
            with psycopg.connect(self.url) as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, params)
                    rows = cur.fetchall()
            results = [
                RetrievedChunk(
                    chunk_id=str(vid),
                    document_id=payload.get("document_id", ""),
                    document_title=payload.get("document_title", "Untitled"),
                    text=payload.get("text", payload.get("chunk_text", "")),
                    score=1.0,
                    metadata=payload,
                )
                for vid, _, payload in rows
            ]
            return results[:top_k]
        except Exception as exc:
            raise RuntimeError(f"PGVector search failed: {exc}") from exc

    async def delete_by_filters(self, filters: dict[str, str]) -> None:
        if not psycopg:
            return
        clause, params = self._build_filter_clause(self.collection_name, filters)
        with psycopg.connect(self.url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(f"DELETE FROM karag_pgvector_embeddings WHERE {clause}", params)

    async def list_by_filters(self, filters: dict[str, str]) -> list[Embedding]:
        if not psycopg:
            return []
        clause, params = self._build_filter_clause(self.collection_name, filters)
        sql = f"SELECT vector_id, embedding, payload FROM karag_pgvector_embeddings WHERE {clause}"
        with psycopg.connect(self.url) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
        return [
            Embedding(
                vector=list(r[1]),
                embedding_type="dense",
                metadata=r[2] if isinstance(r[2], dict) else json.loads(r[2]),
            )
            for r in rows
        ]