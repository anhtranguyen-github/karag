from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def _load_environment() -> None:
    current = Path(__file__).resolve()
    candidates = (
        current.parents[4] / ".env",
        current.parents[2] / ".env",
    )
    for env_path in candidates:
        if env_path.exists():
            load_dotenv(env_path, override=False)


_load_environment()


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(slots=True)
class PlatformSettings:
    app_name: str = os.getenv("APP_NAME", "Karag Enterprise RAG Platform")
    database_url: str = os.getenv("DATABASE_URL", "sqlite+pysqlite:///:memory:")
    default_vector_store: str = os.getenv("DEFAULT_VECTOR_STORE", "qdrant")
    default_storage_provider: str = os.getenv("DEFAULT_STORAGE_PROVIDER", "minio")
    default_event_bus: str = os.getenv("DEFAULT_EVENT_BUS", "redis-streams")
    default_llm_provider: str = os.getenv("DEFAULT_LLM_PROVIDER", "omniroute")
    default_llm_model: str = os.getenv("DEFAULT_LLM_MODEL", "cost-saver")
    default_embedding_provider: str = os.getenv("DEFAULT_EMBEDDING_PROVIDER", "jina")
    default_embedding_model: str = os.getenv("DEFAULT_EMBEDDING_MODEL", "jina-embeddings-v3")
    default_embedding_dimension: int = int(os.getenv("DEFAULT_EMBEDDING_DIMENSION", "1024"))
    default_chunk_size: int = int(os.getenv("DEFAULT_CHUNK_SIZE", "48"))
    
    # RAG Component Defaults
    rag_default_reader: str = os.getenv("RAG_DEFAULT_READER", "marker")
    rag_default_chunker: str = os.getenv("RAG_DEFAULT_CHUNKER", "recursive")
    rag_default_embedder: str = os.getenv("RAG_DEFAULT_EMBEDDER", "dense")
    rag_default_vectorstore: str = os.getenv("RAG_DEFAULT_VECTORSTORE", "qdrant")
    rag_default_reranker: str = os.getenv("RAG_DEFAULT_RERANKER", "jina")
    rag_default_query_transformer: str = os.getenv("RAG_DEFAULT_QUERY_TRANSFORMER", "identity")
    rag_default_generator: str = os.getenv("RAG_DEFAULT_GENERATOR", "openai")
    rag_default_retriever: str = os.getenv("RAG_DEFAULT_RETRIEVER", "hybrid")

    default_qdrant_collection: str = os.getenv("DEFAULT_QDRANT_COLLECTION", "knowledge_chunks")
    redact_llm_content: bool = _env_bool("REDACT_LLM_CONTENT", True)
    redis_url: str | None = os.getenv("REDIS_URL") or None
    redis_stream_name: str = os.getenv("REDIS_STREAM_NAME", "karag.events")
    qdrant_url: str | None = os.getenv("QDRANT_URL") or None
    qdrant_api_key: str | None = os.getenv("QDRANT_API_KEY") or None
    minio_endpoint: str | None = os.getenv("MINIO_ENDPOINT") or None
    minio_access_key: str | None = os.getenv("MINIO_ACCESS_KEY") or None
    minio_secret_key: str | None = os.getenv("MINIO_SECRET_KEY") or None
    minio_bucket: str = os.getenv("MINIO_BUCKET", "karag")
    minio_secure: bool = _env_bool("MINIO_SECURE", False)
    unredacted_workspace_ids: tuple[str, ...] = tuple(
        part.strip()
        for part in os.getenv("UNREDACTED_WORKSPACE_IDS", "").split(",")
        if part.strip()
    )
    llm_base_url: str = os.getenv("LLM_BASE_URL", "http://localhost:20128/v1")
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY") or None
    jina_api_key: str | None = os.getenv("JINA_API_KEY") or None

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_structured: bool = _env_bool("LOG_STRUCTURED", False)
