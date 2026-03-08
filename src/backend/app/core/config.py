from __future__ import annotations

import os
from dataclasses import dataclass


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
    default_embedding_provider: str = os.getenv("DEFAULT_EMBEDDING_PROVIDER", "ollama")
    default_llm_provider: str = os.getenv("DEFAULT_LLM_PROVIDER", "ollama")
    default_chunk_size: int = int(os.getenv("DEFAULT_CHUNK_SIZE", "48"))
    default_qdrant_collection: str = os.getenv(
        "DEFAULT_QDRANT_COLLECTION",
        "knowledge_chunks",
    )
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
