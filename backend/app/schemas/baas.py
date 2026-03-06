"""
BaaS Core Data Models (Blocks 1-5)

This module defines the authoritative data models for the Backend-as-a-Service core:
- Block 1: Identity & Access (Workspace, APIKey)
- Block 2: Data & Storage (Vault, Document, Chunk)
- Block 4: Control Plane (RAGConfig, SystemConfig)
- Block 5: Observability (UsageLog, RAGTrace)

ISOLATION PRINCIPLE: Every model includes workspace_id for tenant isolation.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


# =============================================================================
# BLOCK 1: IDENTITY & ACCESS
# =============================================================================


class RateLimitConfig(BaseModel):
    """
    Rate limiting configuration (non-billing).

    These limits prevent abuse and ensure fair resource usage.
    """

    requests_per_minute: int = Field(60, ge=1, description="Max requests per minute")
    requests_per_hour: int = Field(1000, ge=1, description="Max requests per hour")
    tokens_per_minute: int = Field(100000, ge=1000, description="Max tokens per minute")
    concurrent_requests: int = Field(
        10, ge=1, le=100, description="Max concurrent requests"
    )


class Workspace(BaseModel):
    """
    Workspace entity - the root isolation boundary.

    ISOLATION: All resources belong to exactly one workspace.
    Every request resolves to exactly one workspace via API key mapping.

    Security:
    - Cross-workspace access is explicitly denied at middleware layer
    - Workspace ID is injected into request context and cannot be overridden
    """

    id: str = Field(..., description="Unique workspace identifier (ws_xxx)")
    name: str = Field(
        ..., min_length=1, max_length=100, description="Human-readable name"
    )
    description: Optional[str] = Field(
        None, max_length=500, description="Optional description"
    )
    owner_id: Optional[str] = Field(
        None, description="Reference to owner user (for admin)"
    )

    # Isolation configuration
    dataset_ids: List[str] = Field(
        default_factory=list, description="Associated dataset IDs"
    )
    enabled_datasets: List[str] = Field(
        default_factory=lambda: ["default"],
        description="Datasets this workspace can access",
    )

    # Operational flags
    is_active: bool = Field(True, description="Soft-delete support")
    is_public: bool = Field(False, description="Public read access flag")

    # Rate limiting (non-billing)
    rate_limits: RateLimitConfig = Field(default_factory=RateLimitConfig)

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Statistics
    document_count: int = Field(0, ge=0, description="Cached document count")
    total_chunks: int = Field(0, ge=0, description="Cached total chunks")

    model_config = {"populate_by_name": True}


class APIKey(BaseModel):
    """
    API Key for workspace-scoped authentication.

    ISOLATION: Each key maps to exactly one workspace.

    Security:
    - Keys are hashed with Argon2, only prefix is stored
    - Full key is shown ONLY once on creation
    - Keys can be revoked with audit trail

    Usage:
    - Header: X-API-Key: <key>
    - Or: Authorization: Bearer <key>
    """

    id: str = Field(..., description="Key identifier (key_xxx)")
    workspace_id: str = Field(
        ..., description="Associated workspace - ISOLATION BOUNDARY"
    )

    # Key material (security)
    key_hash: str = Field(..., description="Argon2 hash of the key")
    key_prefix: str = Field(
        ..., min_length=8, max_length=16, description="First N chars for identification"
    )

    # Permissions (scoped to workspace)
    permissions: List[Literal["read", "write", "delete", "admin"]] = Field(
        default_factory=lambda: ["read", "write"], description="Granted permissions"
    )

    # Lifecycle
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = Field(None, description="Optional expiration")
    last_used_at: Optional[datetime] = Field(None, description="Last usage timestamp")

    # Status
    is_active: bool = Field(True, description="Active status")
    revoked_at: Optional[datetime] = Field(None, description="Revocation timestamp")
    revoked_reason: Optional[str] = Field(None, description="Reason for revocation")

    # Usage tracking
    use_count: int = Field(0, ge=0, description="Number of times used")

    model_config = {"populate_by_name": True}


class APIKeyCreateResponse(BaseModel):
    """Response when creating a new API key - ONLY time full key is visible."""

    id: str
    workspace_id: str
    api_key: str = Field(..., description="FULL KEY - SAVE THIS NOW")
    key_prefix: str
    permissions: List[str]
    expires_at: Optional[datetime]
    created_at: datetime

    warning: str = Field(
        default="This is the ONLY time the API key will be displayed. Store it securely.",
        description="Security warning",
    )


# =============================================================================
# BLOCK 2: DATA & STORAGE
# =============================================================================


class VectorStoreConfig(BaseModel):
    """Configuration for vector store backend."""

    provider: Literal["qdrant", "pinecone", "weaviate"] = "qdrant"
    collection_name: Optional[str] = None  # Auto-generated if not set
    dimension: int = Field(1536, ge=128, le=4096)
    distance_metric: Literal["cosine", "dot", "euclidean"] = "cosine"


class FileStoreConfig(BaseModel):
    """Configuration for file/object storage."""

    provider: Literal["minio", "s3", "gcs", "azure"] = "minio"
    bucket: str = "rag-docs"
    prefix: str = ""  # Path prefix for this vault


class Vault(BaseModel):
    """
    Vault - logical storage unit for documents and embeddings.

    TYPES:
    - global: Platform-owned, read-only, shared across workspaces
    - workspace: Isolated per workspace, full CRUD

    ISOLATION:
    - Workspace vaults use collection naming: "ws_{workspace_id}_kb"
    - Global vaults are read-only for all workspaces
    """

    id: str = Field(..., description="Vault identifier (vault_xxx)")

    # Storage configuration
    file_store_config: FileStoreConfig = Field(default_factory=FileStoreConfig)

    # Metadata
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

    # Status
    is_active: bool = Field(True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Statistics
    document_count: int = Field(0, ge=0)
    total_size_bytes: int = Field(0, ge=0)


class Document(BaseModel):
    """
    Document - a file ingested into a vault.

    ISOLATION: Documents are scoped to vault + workspace.
    Cross-workspace access is prevented by query filters.

    LIFECYCLE: uploaded → processing → indexed → (archived)
                          ↓
                       failed
    """

    id: str = Field(..., description="Document identifier (doc_xxx)")
    vault_id: Optional[str] = Field(None, description="Parent global vault (if stored globally)")
    dataset_id: Optional[str] = Field(None, description="Parent dataset (if indexed in workspace)")
    workspace_id: str = Field(..., description="Owning workspace - ISOLATION")

    # File metadata
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., description="MIME type")
    size_bytes: int = Field(..., ge=0, description="File size in bytes")
    content_hash: str = Field(..., description="SHA-256 for deduplication")

    # Storage
    storage_path: str = Field(..., description="Path in object storage")

    # Processing status
    status: Literal[
        "uploaded",  # File stored, not processed
        "processing",  # Chunking/embedding in progress
        "indexed",  # Fully indexed and searchable
        "failed",  # Processing failed
        "archived",  # Soft-deleted
    ] = Field(default="uploaded")

    # Error tracking (for failed status)
    error_message: Optional[str] = None
    error_count: int = Field(0, ge=0, description="Number of processing failures")

    # Content metadata
    language: Optional[str] = Field(None, description="Detected language (ISO 639-1)")
    page_count: Optional[int] = Field(None, ge=0)
    word_count: Optional[int] = Field(None, ge=0)

    # Processing results
    chunks_count: int = Field(0, ge=0, description="Number of chunks generated")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    indexed_at: Optional[datetime] = None

    # Versioning
    version: int = Field(1, ge=1, description="Document version")


class Chunk(BaseModel):
    """
    Chunk - a text segment with embedding vector.

    STORAGE NOTE:
    - Full chunk data (text + vector) stored in vector store (Qdrant)
    - This model represents metadata stored in MongoDB for management

    ISOLATION: workspace_id ensures cross-workspace access prevention.
    """

    id: str = Field(..., description="Chunk identifier (chunk_xxx)")
    document_id: str = Field(..., description="Parent document")
    dataset_id: str = Field(..., description="Parent dataset")
    workspace_id: str = Field(..., description="For isolation validation")

    # Content (stored in vector store, not MongoDB)
    text_preview: str = Field(..., max_length=200, description="First 200 chars")
    text_hash: str = Field(..., description="Hash for deduplication")

    # Position
    chunk_index: int = Field(..., ge=0, description="Position in document")
    start_char: int = Field(..., ge=0, description="Start position in original")
    end_char: int = Field(..., ge=0, description="End position in original")

    # Metadata
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Source, headers, etc."
    )

    # Embedding reference
    vector_point_id: str = Field(..., description="ID in vector store")
    embedding_model: str = Field(..., description="Model used for embedding")
    embedding_dimensions: int = Field(..., ge=128, le=4096)

    # Search metadata
    token_count: int = Field(0, ge=0, description="Approximate token count")

    created_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# BLOCK 4: CONTROL PLANE
# =============================================================================


class RAGConfig(BaseModel):
    """
    RAG configuration - controls retrieval behavior.

    MUTABILITY: All fields are runtime mutable.
    Changes take effect immediately for new requests.
    """

    # Retrieval settings
    retrieval_mode: Literal["vector", "hybrid", "graph"] = Field(
        default="hybrid", description="Retrieval strategy"
    )
    top_k: int = Field(5, ge=1, le=50, description="Number of chunks to retrieve")

    # Hybrid search weights
    vector_weight: float = Field(
        0.7, ge=0.0, le=1.0, description="Vector search weight"
    )
    keyword_weight: float = Field(
        0.3, ge=0.0, le=1.0, description="Keyword search weight"
    )

    # Reranking
    rerank_enabled: bool = Field(False, description="Enable reranking")
    rerank_model: Optional[str] = Field(None, description="Reranker model name")
    rerank_top_k: int = Field(3, ge=1, le=10, description="Top K after reranking")

    # Context assembly
    max_context_tokens: int = Field(
        4000, ge=500, le=8000, description="Max tokens in context window"
    )
    context_template: str = Field("default", description="Context assembly template")

    # Source tracking
    include_citations: bool = Field(True, description="Include source citations")
    min_similarity_score: float = Field(
        0.7, ge=0.0, le=1.0, description="Minimum similarity threshold"
    )

    @field_validator("keyword_weight")
    @classmethod
    def validate_weights(cls, v: float, info) -> float:
        """Ensure vector + keyword weights sum to 1.0."""
        values = info.data
        if "vector_weight" in values:
            total = values["vector_weight"] + v
            if abs(total - 1.0) > 0.01:
                raise ValueError(f"Weights must sum to 1.0, got {total}")
        return v


class SystemConfig(BaseModel):
    """
    System-level configuration (operator-only).

    MUTABILITY:
    - Runtime mutable: allowed_models, request_timeout
    - Restart required: max_context_window, embedding_dim

    ACCESS: Operator/admin only, not visible to workspaces.
    """

    # Model restrictions
    allowed_models: List[str] = Field(
        default_factory=lambda: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
        description="Whitelist of LLM models",
    )
    max_context_window: int = Field(
        128000, ge=4096, description="Maximum context window"
    )
    max_tokens_per_request: int = Field(4096, ge=256, description="Max output tokens")

    # RAG defaults
    default_rag_config: RAGConfig = Field(default_factory=RAGConfig)

    # Feature flags
    enable_global_vault: bool = Field(True, description="Enable global vault access")
    enable_workspace_sharing: bool = Field(
        False, description="Enable doc sharing between workspaces"
    )

    # Operational
    request_timeout_seconds: int = Field(60, ge=10, le=300)
    max_upload_size_mb: int = Field(100, ge=1, le=500)

    # Embedding configuration (restart required to change)
    default_embedding_model: str = "text-embedding-3-small"
    default_embedding_dimensions: int = 1536


class WorkspaceConfig(BaseModel):
    """
    Workspace-level configuration (restricted).

    Workspaces can modify these within system-defined limits.
    """

    workspace_id: str

    # Dataset access
    enabled_datasets: List[str] = Field(default_factory=lambda: ["default"])
    default_dataset_id: str = "default"

    # RAG settings (clamped by system limits)
    rag_config: RAGConfig = Field(default_factory=RAGConfig)

    # Generation defaults (clamped)
    default_temperature: float = Field(0.7, ge=0.0, le=2.0)
    default_max_tokens: int = Field(1024, ge=1, le=4096)
    default_model: str = "gpt-4o"

    # Rate limits (enforced, not billing)
    rate_limits: RateLimitConfig = Field(default_factory=RateLimitConfig)


class RequestConfig(BaseModel):
    """
    Request-level configuration (clamped by workspace limits).

    These parameters can be passed in API requests but are
    validated against workspace and system limits.
    """

    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(None, ge=1)
    stream: bool = Field(True, description="Stream response")

    # RAG overrides
    use_rag: Optional[bool] = None
    dataset_id: Optional[str] = None
    top_k: Optional[int] = Field(None, ge=1, le=50)

    @field_validator("max_tokens")
    @classmethod
    def validate_max_tokens(cls, v: Optional[int]) -> Optional[int]:
        """Max tokens will be clamped to system limit during resolution."""
        return v


# =============================================================================
# BLOCK 5: OBSERVABILITY
# =============================================================================


class RetrievedSource(BaseModel):
    """Individual retrieved chunk source for RAG trace."""

    document_id: str
    chunk_index: int
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    text_preview: str = Field(..., max_length=100)
    dataset_id: str


class RAGTrace(BaseModel):
    """Detailed RAG operation trace for observability."""

    dataset_id: str
    query: str = Field(..., max_length=500, description="Original query (truncated)")

    # Retrieval results
    chunks_retrieved: int = Field(..., ge=0)
    retrieval_latency_ms: float = Field(..., ge=0.0)

    # Sources
    sources: List[RetrievedSource] = Field(default_factory=list)

    # Context assembly
    context_tokens: int = Field(0, ge=0)
    context_documents: int = Field(0, ge=0)

    # Reranking (if enabled)
    rerank_latency_ms: Optional[float] = None
    rerank_input_count: Optional[int] = None


class UsageLog(BaseModel):
    """
    Usage log entry for observability.

    REDACTION: No API keys, tokens, or PII in logs.
    All sensitive fields are hashed or omitted.

    STORAGE: Written to MongoDB (usage_logs collection) and/or
    exported to external log aggregation.
    """

    id: str = Field(..., description="Log entry ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Request context
    correlation_id: str
    workspace_id: str
    api_key_id: str = Field(..., description="Reference only, not the key")

    # Request details (sanitized)
    method: str
    path: str
    endpoint: str = Field(..., description="Normalized endpoint path")

    # Response
    status_code: int = Field(..., ge=100, le=599)
    duration_ms: float = Field(..., ge=0.0)

    # Token usage (if applicable)
    prompt_tokens: Optional[int] = Field(None, ge=0)
    completion_tokens: Optional[int] = Field(None, ge=0)
    embedding_tokens: Optional[int] = Field(None, ge=0)
    total_tokens: Optional[int] = Field(None, ge=0)

    # RAG trace (if applicable)
    rag_trace: Optional[RAGTrace] = None

    # Error info (if failed)
    error_code: Optional[str] = None
    error_message: Optional[str] = Field(None, max_length=500)

    # Client info
    client_ip_hash: Optional[str] = Field(None, description="Hashed IP for privacy")
    user_agent_hash: Optional[str] = Field(None, description="Hashed UA for privacy")


class WorkspaceUsageStats(BaseModel):
    """Aggregated usage statistics for a workspace."""

    workspace_id: str
    period_start: datetime
    period_end: datetime

    # Request counts
    total_requests: int
    successful_requests: int
    failed_requests: int

    # Token usage
    total_prompt_tokens: int
    total_completion_tokens: int
    total_embedding_tokens: int

    # RAG usage
    rag_queries: int
    total_chunks_retrieved: int

    # Performance
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float


# =============================================================================
# API RESPONSE MODELS
# =============================================================================


class IsolationContext(BaseModel):
    """
    Injected workspace context for every request.

    This is attached to the request state by middleware
    and used throughout the request lifecycle.
    """

    workspace_id: str
    api_key_id: str
    permissions: List[str]
    dataset_ids: List[str]

    def has_permission(self, permission: str) -> bool:
        """Check if context has specific permission."""
        return permission in self.permissions or "admin" in self.permissions


class DatasetAccessError(BaseModel):
    """Error response for dataset access violations."""

    error: str = "DATASET_ACCESS_DENIED"
    message: str
    workspace_id: str
    dataset_id: str
    required_permission: str
