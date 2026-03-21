from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

DEFAULT_PROMPT_TEMPLATE = (
    "You are an assistant that answers using the provided context.\n\n"
    "Context:\n{{context}}\n\n"
    "Question:\n{{question}}\n\n"
    "Answer:"
)


# ── Workspace admin models ───────────────────────────────


class WorkspaceCreate(BaseModel):
    id: str | None = None
    name: str
    description: str | None = None


class WorkspaceSummary(BaseModel):
    id: str
    organization_id: str
    project_id: str
    name: str
    description: str | None = None
    status: str
    created_at: datetime


# ── Workspace RAG config blocks ──────────────────────────


class EmbeddingConfig(BaseModel):
    """Bundles the embedder component name with its parameters."""
    component: str
    provider: str
    model: str
    dimension: int | None = None
    batch_size: int
    api_key: str | None = None
    api_base: str | None = None


class ChunkingConfig(BaseModel):
    """Bundles the chunker component name with its parameters."""
    component: str
    chunk_size: int
    chunk_overlap: int

    @field_validator("chunk_size")
    @classmethod
    def chunk_size_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("chunk_size must be greater than 0")
        return v

    @field_validator("chunk_overlap")
    @classmethod
    def chunk_overlap_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("chunk_overlap must be >= 0")
        return v

    @model_validator(mode="after")
    def overlap_lt_size(self) -> ChunkingConfig:
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")
        return self


class VectorStoreConfig(BaseModel):
    """Bundles the vectorstore component name with its parameters."""
    component: str
    url: str | None = None
    api_key: str | None = None
    collection_name: str | None = None
    distance_metric: str
    index_type: str
    vector_dimension: int | None = None


class RetrieverConfig(BaseModel):
    """Bundles the retriever component name with its parameters."""
    component: str
    top_k: int
    score_threshold: float

    @field_validator("top_k")
    @classmethod
    def top_k_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("top_k must be greater than 0")
        return v


class RerankerConfig(BaseModel):
    """Bundles the reranker component name with its parameters."""
    component: str
    provider: str
    model: str
    top_k: int = 3
    api_key: str | None = None
    api_base: str | None = None


class LlmConfig(BaseModel):
    provider: str
    model: str
    temperature: float
    max_tokens: int
    streaming: bool
    api_key: str | None = None
    api_base: str | None = None


class RAGConfig(BaseModel):
    """RAG pipeline behavior settings."""
    reader: str
    query_transformer: str
    generator: str
    prompt_template: str
    max_context_tokens: int
    context_compression: bool
    citation_mode: str
    context_formatting_template: str


# ── WorkspaceSetting: single source of truth (RAG only) ──


class WorkspaceSettingUpdate(BaseModel):
    """Partial update payload — every field is optional."""
    embedding: EmbeddingConfig | None = None
    chunking: ChunkingConfig | None = None
    vectorstore: VectorStoreConfig | None = None
    retriever: RetrieverConfig | None = None
    reranker: RerankerConfig | None = None
    llm: LlmConfig | None = None
    rag: RAGConfig | None = None
    features: dict | None = None

    @staticmethod
    def _normalize_embedding(normalized: dict[str, Any]) -> None:
        if "embedding_config" not in normalized or "embedding" in normalized:
            return
        embedding_payload = normalized.pop("embedding_config")
        if isinstance(embedding_payload, dict):
            embedding_payload.setdefault("component", normalized.pop("embedder", "dense"))
            normalized["embedding"] = embedding_payload

    @staticmethod
    def _normalize_retriever_and_chunking(normalized: dict[str, Any]) -> None:
        if "retrieval_config" not in normalized:
            return
        retrieval_payload = normalized.pop("retrieval_config")
        if not isinstance(retrieval_payload, dict):
            return
        if "retriever" not in normalized:
            normalized["retriever"] = {
                "component": normalized.pop("retriever", "hybrid"),
                "top_k": retrieval_payload.get("top_k", 3),
                "score_threshold": retrieval_payload.get("score_threshold", 0.0),
            }
        if "chunking" not in normalized:
            normalized["chunking"] = {
                "component": normalized.pop("chunker", "recursive"),
                "chunk_size": retrieval_payload.get("chunk_size", 512),
                "chunk_overlap": retrieval_payload.get("chunk_overlap", 64),
            }

    @staticmethod
    def _normalize_vectorstore(normalized: dict[str, Any]) -> None:
        if "vector_store_config" not in normalized or "vectorstore" in normalized:
            return
        vectorstore_payload = normalized.pop("vector_store_config")
        if isinstance(vectorstore_payload, dict):
            vectorstore_payload.setdefault("component", normalized.pop("vectorstore", "qdrant"))
            normalized.pop("vector_store_type", None)
            normalized["vectorstore"] = vectorstore_payload

    @staticmethod
    def _normalize_reranker(normalized: dict[str, Any]) -> None:
        if "rerank_config" not in normalized or "reranker" in normalized:
            return
        reranker_payload = normalized.pop("rerank_config")
        if isinstance(reranker_payload, dict):
            reranker_payload.setdefault("component", normalized.pop("reranker", "jina"))
            normalized["reranker"] = reranker_payload

    @staticmethod
    def _normalize_rag(normalized: dict[str, Any]) -> None:
        if "reading_config" not in normalized or "rag" in normalized:
            return
        reading_payload = normalized.pop("reading_config")
        if isinstance(reading_payload, dict):
            normalized["rag"] = {
                "reader": normalized.pop("reader", "marker"),
                "query_transformer": normalized.pop("query_transformer", "identity"),
                "generator": normalized.pop("generator", "openai"),
                "prompt_template": normalized.pop("prompt_template", DEFAULT_PROMPT_TEMPLATE),
                "max_context_tokens": reading_payload.get("max_context_tokens", 4000),
                "context_compression": reading_payload.get("context_compression", False),
                "citation_mode": reading_payload.get("citation_mode", "inline"),
                "context_formatting_template": reading_payload.get(
                    "context_formatting_template", "[{index}] {text}"
                ),
            }

    @staticmethod
    def _drop_legacy_fields(normalized: dict[str, Any]) -> None:
        if "llm_config" in normalized and "llm" not in normalized:
            normalized["llm"] = normalized.pop("llm_config")
        string_legacy_keys = (
            "embedder",
            "chunker",
            "reader",
            "query_transformer",
            "generator",
            "vector_store_type",
            "prompt_template",
        )
        for old_key in string_legacy_keys:
            normalized.pop(old_key, None)

        for selector_key in ("retriever", "vectorstore", "reranker"):
            value = normalized.get(selector_key)
            if isinstance(value, str):
                normalized.pop(selector_key, None)

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_payload(cls, raw_value: Any) -> Any:
        if not isinstance(raw_value, dict):
            return raw_value

        normalized = dict(raw_value)

        cls._normalize_embedding(normalized)
        cls._normalize_retriever_and_chunking(normalized)
        cls._normalize_vectorstore(normalized)
        cls._normalize_reranker(normalized)
        cls._normalize_rag(normalized)
        cls._drop_legacy_fields(normalized)

        return normalized


# Static compatibility matrix — which vectorstores support which embedding types.
_VECTORSTORE_SUPPORTED_TYPES: dict[str, set[str]] = {
    "qdrant": {"dense", "hybrid"},
    "pgvector": {"dense"},
}
_EMBEDDER_TYPE: dict[str, str] = {
    "dense": "dense",
    "multi_vector": "multi_vector",
    "graph": "graph",
}
_VECTORSTORE_HYBRID: set[str] = {"qdrant"}


class WorkspaceSetting(BaseModel):
    """Single source of truth for all workspace-level RAG configuration."""
    workspace_id: str

    # RAG pipeline configs
    embedding: EmbeddingConfig
    chunking: ChunkingConfig
    vectorstore: VectorStoreConfig
    retriever: RetrieverConfig
    reranker: RerankerConfig

    # LLM & RAG behavior
    llm: LlmConfig
    rag: RAGConfig

    # Feature flags
    features: dict[str, Any] = Field(default_factory=dict)

    updated_at: datetime

    @model_validator(mode="after")
    def check_component_compatibility(self) -> WorkspaceSetting:
        errors: list[str] = []
        emb_type = _EMBEDDER_TYPE.get(self.embedding.component, self.embedding.component)
        vs_name = self.vectorstore.component
        ret_name = self.retriever.component

        # Embedding type must be supported by vectorstore
        supported = _VECTORSTORE_SUPPORTED_TYPES.get(vs_name)
        if supported is not None and emb_type not in supported:
            errors.append(
                f"embedding type '{emb_type}' is not supported by vectorstore '{vs_name}'"
            )

        # Hybrid retriever needs a vectorstore with hybrid support
        if ret_name == "hybrid" and vs_name not in _VECTORSTORE_HYBRID:
            errors.append(
                f"hybrid retriever requires a vectorstore with hybrid support (not '{vs_name}')"
            )

        # multi_vector embedder not supported by current vectorstores
        if emb_type == "multi_vector":
            errors.append(
                "multi_vector embedder requires a vector store and retriever with multi-vector support"
            )

        if errors:
            raise ValueError("; ".join(errors))
        return self


WorkspaceRagConfig = WorkspaceSetting
WorkspaceRagConfigUpdate = WorkspaceSettingUpdate
