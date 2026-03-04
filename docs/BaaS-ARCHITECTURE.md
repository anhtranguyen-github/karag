# Karag BaaS Core Architecture

## Executive Summary

This document describes the Backend-as-a-Service (BaaS) core architecture for Karag, covering Blocks 1-5: Identity & Access, Data & Storage, Compute & APIs, Control Plane, and Observability.

**Key Principles:**
- Workspace-based isolation at every layer
- Deny-by-default security model
- OpenAI API compatibility preserved
- Stateless inference APIs
- No billing/subscription logic

---

## 1. Architecture Overview

### 1.1 End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT REQUEST                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │   API Key    │  │   Request    │  │   Optional   │                       │
│  │   Header     │  │    Body      │  │   Metadata   │                       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                       │
└─────────┼─────────────────┼─────────────────┼───────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BLOCK 1: IDENTITY & ACCESS                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    API Key Authentication Middleware                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│  │  │ Extract Key  │→ │ Lookup Hash  │→ │ Inject Workspace Context │   │   │
│  │  │ X-API-Key    │  │  api_keys    │  │  workspace_id, vaults    │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │   │
│  │                                                                       │   │
│  │  ISOLATION ENFORCEMENT: Every request resolves to exactly ONE         │   │
│  │  workspace. Cross-workspace access is explicitly denied.              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BLOCK 4: CONTROL PLANE                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Configuration Resolution Layer                     │   │
│  │                                                                       │   │
│  │   Precedence (high to low):                                           │   │
│  │   1. Request-level params (clamped by workspace limits)               │   │
│  │   2. Workspace settings (from MongoDB)                                │   │
│  │   3. System defaults (from env/config)                                │   │
│  │                                                                       │   │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │   │  System Config  │  │ Workspace Config│  │  Request Config │      │   │
│  │   │  (operator-only)│  │ (restricted)    │  │ (clamped)       │      │   │
│  │   │  • max_tokens   │  │ • enabled_vaults│  │ • temperature   │      │   │
│  │   │  • context_win  │  │ • rag_preset    │  │ • top_p         │      │   │
│  │   │  • allowed_models│ │ • rate_limits   │  │ • stream        │      │   │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BLOCK 2: DATA & STORAGE                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Vault Resolution Layer                         │   │
│  │                                                                       │   │
│  │   Request: workspace_id + vault_type (global|workspace)               │   │
│  │                                                                       │   │
│  │   ┌─────────────────────┐      ┌─────────────────────┐               │   │
│  │   │   GLOBAL VAULT      │      │   WORKSPACE VAULT   │               │   │
│  │   │   (platform-owned)  │      │   (isolated)        │               │   │
│  │   │   • Read-only       │      │   • Full CRUD       │               │   │
│  │   │   • Shared across   │      │   • No cross-access │               │   │
│  │   │     all workspaces  │      │   • Workspace-scoped│               │   │
│  │   │   • collection:     │      │     vectors         │               │   │
│  │   │     global_kb       │      │     chunks          │               │   │
│  │   └─────────────────────┘      └─────────────────────┘               │   │
│  │                                                                       │   │
│  │   ISOLATION: Workspace vaults use collection naming:                  │   │
│  │   • qdrant: "ws_{workspace_id}_kb"                                    │   │
│  │   • mongo:  documents.workspace_id == workspace_id                    │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BLOCK 3: COMPUTE & APIs                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     Inference Pipeline (Stateless)                    │   │
│  │                                                                       │   │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────┐ │   │
│  │   │   RAG Hook  │ → │  Retrieval  │ → │   Context   │ → │   LLM    │ │   │
│  │   │   (opt)     │   │  (vault)    │   │   Assembly  │   │  Call    │ │   │
│  │   └─────────────┘   └─────────────┘   └─────────────┘   └──────────┘ │   │
│  │                                                                       │   │
│  │   RAG Integration Points:                                             │   │
│  │   1. If model starts with "karag:", RAG is enabled                    │   │
│  │   2. Query → Vector Search (workspace vault)                        │   │
│  │   3. Results → Context Assembly with citations                        │   │
│  │   4. Context → LLM prompt augmentation                                │   │
│  │                                                                       │   │
│  │   OpenAI Compatibility:                                               │   │
│  │   • /v1/chat/completions  →  RAG-enabled chat                         │   │
│  │   • /v1/embeddings        →  Workspace-scoped embeddings              │   │
│  │   • /v1/models            →  Available models per workspace           │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BLOCK 5: OBSERVABILITY                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      Telemetry Pipeline                               │   │
│  │                                                                       │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │   │ Request Log  │  │  Token Usage │  │  RAG Trace   │               │   │
│  │   │ • method     │  │ • prompt     │  │ • chunks     │               │   │
│  │   │ • path       │  │ • completion │  │ • vault_src  │               │   │
│  │   │ • workspace  │  │ • embedding  │  │ • scores     │               │   │
│  │   │ • duration   │  │ • total      │  │ • latency    │               │   │
│  │   └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                       │   │
│  │   REDACTION: API keys, tokens, PII scrubbed before logging            │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RESPONSE                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Layer Responsibilities

| Block | Layer | Responsibility | Isolation Point |
|-------|-------|----------------|-----------------|
| 1 | Identity | API Key → Workspace resolution | Request context injection |
| 1 | Access Control | Deny-by-default, permission checks | Middleware enforcement |
| 2 | Vault | Document storage abstraction | Collection/workspace scoping |
| 2 | Vector Store | Embedding storage & search | Per-workspace collections |
| 3 | Inference | OpenAI-compatible endpoints | Stateless, context-aware |
| 3 | RAG | Retrieval-augmented generation | Vault-scoped retrieval |
| 4 | Config | Layered configuration | Validation & clamping |
| 5 | Logging | Structured request logs | Workspace attribution |
| 5 | Metrics | Prometheus counters | Label-based aggregation |

---

## 2. Data Models

### 2.1 Core Entity Models

#### Workspace

```python
class Workspace(BaseModel):
    """
    Workspace entity - the root isolation boundary.
    
    ISOLATION: All resources belong to exactly one workspace.
    """
    id: str                          # Unique workspace identifier (ws_xxx)
    name: str                        # Human-readable name
    description: Optional[str]       # Optional description
    owner_id: str                    # Reference to owner (for admin)
    
    # Isolation configuration
    vault_ids: List[str]             # Associated vaults (usually ["default"])
    enabled_vaults: List[str]        # Vaults this workspace can access
    
    # Operational flags
    is_active: bool = True           # Soft-delete support
    is_public: bool = False          # Public read access (if applicable)
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    
    # Rate limiting (non-billing)
    rate_limits: RateLimitConfig     # Requests per minute/hour
```

#### APIKey

```python
class APIKey(BaseModel):
    """
    API Key for workspace-scoped authentication.
    
    ISOLATION: Each key maps to exactly one workspace.
    SECURITY: Keys are hashed, only shown once on creation.
    """
    id: str                          # Key identifier (key_xxx)
    workspace_id: str                # Associated workspace
    
    # Key material
    key_hash: str                    # Argon2 hash of the key
    key_prefix: str                  # First 8 chars for identification
    
    # Permissions (scoped to workspace)
    permissions: List[str]           # ["read", "write", "admin"]
    
    # Lifecycle
    created_at: datetime
    expires_at: Optional[datetime]   # Optional expiration
    last_used_at: Optional[datetime]
    
    # Status
    is_active: bool = True
    revoked_at: Optional[datetime]
    revoked_reason: Optional[str]
```

#### Vault

```python
class Vault(BaseModel):
    """
    Vault - logical storage unit for documents and embeddings.
    
    TYPES:
    - global: Platform-owned, read-only, shared
    - workspace: Isolated per workspace, full CRUD
    """
    id: str                          # Vault identifier (vault_xxx)
    type: Literal["global", "workspace"]
    
    # Ownership
    owner_workspace_id: Optional[str]  # None for global vaults
    
    # Storage configuration
    vector_store_config: VectorStoreConfig
    file_store_config: FileStoreConfig
    
    # Access control
    allowed_workspace_ids: List[str]   # For global: which workspaces can read
    
    # Metadata
    name: str
    description: Optional[str]
    created_at: datetime
    
    # Statistics
    document_count: int = 0
    total_chunks: int = 0
    total_size_bytes: int = 0
```

#### Document

```python
class Document(BaseModel):
    """
    Document - a file ingested into a vault.
    
    ISOLATION: Documents are scoped to vault + workspace.
    """
    id: str                          # Document identifier (doc_xxx)
    vault_id: str                    # Parent vault
    workspace_id: str                # Owning workspace
    
    # File metadata
    filename: str                    # Original filename
    content_type: str                # MIME type
    size_bytes: int                  # File size
    content_hash: str                # SHA-256 for deduplication
    
    # Storage
    storage_path: str                # Path in object storage (MinIO)
    
    # Processing status
    status: Literal[
        "uploaded",                  # File stored, not processed
        "processing",                # Chunking/embedding in progress
        "indexed",                   # Fully indexed and searchable
        "failed",                    # Processing failed
        "archived"                   # Soft-deleted
    ] = "uploaded"
    
    # Content metadata
    language: Optional[str]          # Detected language
    page_count: Optional[int]        # For PDFs
    word_count: Optional[int]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    indexed_at: Optional[datetime]
```

#### Chunk

```python
class Chunk(BaseModel):
    """
    Chunk - a text segment with embedding vector.
    
    STORAGE: Chunks are stored in vector store (Qdrant), not MongoDB.
    MongoDB stores only metadata for management.
    """
    id: str                          # Chunk identifier (chunk_xxx)
    document_id: str                 # Parent document
    vault_id: str                    # Parent vault
    workspace_id: str                # For isolation validation
    
    # Content
    text: str                        # Chunk text content
    text_hash: str                   # Hash for deduplication
    
    # Position
    chunk_index: int                 # Position in document
    start_char: int                  # Start position in original
    end_char: int                    # End position in original
    
    # Metadata
    metadata: Dict[str, Any]         # Source, headers, etc.
    
    # Embedding (stored in vector store)
    embedding_vector_id: str         # Reference to Qdrant point
    embedding_model: str             # Model used for embedding
    embedding_dimensions: int        # Vector dimensions
    
    created_at: datetime
```

### 2.2 Configuration Models

#### RAGConfig

```python
class RAGConfig(BaseModel):
    """
    RAG configuration - controls retrieval behavior.
    
    MUTABILITY: Most fields are runtime mutable.
    """
    # Retrieval settings
    retrieval_mode: Literal["vector", "hybrid", "graph"] = "hybrid"
    top_k: int = Field(5, ge=1, le=50)
    
    # Hybrid search weights
    vector_weight: float = Field(0.7, ge=0.0, le=1.0)
    keyword_weight: float = Field(0.3, ge=0.0, le=1.0)
    
    # Reranking
    rerank_enabled: bool = False
    rerank_model: Optional[str] = None
    rerank_top_k: int = Field(3, ge=1, le=10)
    
    # Context assembly
    max_context_tokens: int = Field(4000, ge=500, le=8000)
    context_template: str = "default"
    
    # Source tracking
    include_citations: bool = True
    min_similarity_score: float = Field(0.7, ge=0.0, le=1.0)
```

#### SystemConfig

```python
class SystemConfig(BaseModel):
    """
    System-level configuration (operator-only).
    
    MUTABILITY: Changes require restart for some fields.
    """
    # Model restrictions
    allowed_models: List[str]        # Whitelist of LLM models
    max_context_window: int          # Maximum tokens per request
    max_tokens_per_request: int      # Output token limit
    
    # RAG defaults
    default_rag_config: RAGConfig
    
    # Feature flags
    enable_global_vault: bool = True
    enable_workspace_sharing: bool = False
    
    # Operational
    request_timeout_seconds: int = 60
    max_upload_size_mb: int = 100
```

### 2.3 Observability Models

#### UsageLog

```python
class UsageLog(BaseModel):
    """
    Usage log entry for observability.
    
    REDACTION: No API keys, tokens, or PII in logs.
    """
    id: str                          # Log entry ID
    timestamp: datetime
    
    # Request context
    correlation_id: str
    workspace_id: str
    api_key_id: str                  # Reference, not the key
    
    # Request details
    method: str
    path: str
    endpoint: str                    # Normalized (e.g., /v1/chat/completions)
    
    # Response
    status_code: int
    duration_ms: float
    
    # Token usage (if applicable)
    prompt_tokens: Optional[int]
    completion_tokens: Optional[int]
    embedding_tokens: Optional[int]
    total_tokens: Optional[int]
    
    # RAG trace (if applicable)
    rag_trace: Optional[RAGTrace]
    
    # Error info (if failed)
    error_code: Optional[str]
    error_message: Optional[str]


class RAGTrace(BaseModel):
    """Detailed RAG operation trace."""
    vault_id: str
    query: str                       # Original query (truncated)
    
    # Retrieval results
    chunks_retrieved: int
    retrieval_latency_ms: float
    
    # Sources
    sources: List[RetrievedSource]
    
    # Context assembly
    context_tokens: int
    context_documents: int


class RetrievedSource(BaseModel):
    """Individual retrieved chunk source."""
    document_id: str
    chunk_index: int
    similarity_score: float
    text_preview: str                # First 100 chars
```

---

## 3. API Surface

### 3.1 Inference APIs (OpenAI-Compatible)

| Endpoint | Method | Description | Workspace Scoped |
|----------|--------|-------------|------------------|
| `/v1/chat/completions` | POST | Chat with optional RAG | Yes (via API key) |
| `/v1/embeddings` | POST | Generate embeddings | Yes (via API key) |
| `/v1/models` | GET | List available models | Yes (filtered) |

**Headers:**
```
Authorization: Bearer <api_key>
X-Correlation-ID: <optional trace id>
```

### 3.2 Control Plane APIs (Internal)

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/admin/workspaces` | CRUD | Workspace management | Operator only |
| `/admin/api-keys` | CRUD | API key management | Operator/Admin |
| `/admin/system/config` | GET/PUT | System configuration | Operator only |
| `/admin/usage/logs` | GET | Usage logs query | Operator only |
| `/admin/usage/metrics` | GET | Prometheus metrics | Operator only |

### 3.3 Workspace APIs (Scoped)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/workspaces/{id}/vaults` | GET | List vaults |
| `/workspaces/{id}/vaults/{id}/documents` | CRUD | Document management |
| `/workspaces/{id}/rag/config` | GET/PUT | RAG configuration |
| `/workspaces/{id}/usage` | GET | Workspace usage stats |

---

## 4. Isolation Mechanisms

### 4.1 Workspace Isolation Enforcement

```
┌─────────────────────────────────────────────────────────────────┐
│                    ISOLATION CHECKPOINTS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. AUTHENTICATION LAYER                                        │
│     ├─ API Key lookup → workspace_id extraction                 │
│     └─ No workspace_id in request = 401 Unauthorized            │
│                                                                 │
│  2. AUTHORIZATION LAYER                                         │
│     ├─ Check key permissions for requested operation            │
│     └─ Insufficient permissions = 403 Forbidden                 │
│                                                                 │
│  3. DATA ACCESS LAYER                                           │
│     ├─ MongoDB queries include {"workspace_id": "ws_xxx"}       │
│     ├─ Vector store uses workspace-scoped collection            │
│     └─ Cross-workspace queries = filtered out                   │
│                                                                 │
│  4. GLOBAL VAULT ACCESS                                         │
│     ├─ Explicit vault_type="global" required                    │
│     ├─ Read-only operations only                                │
│     └─ Write attempts = 403 Forbidden                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Cross-Workspace Access Prevention

```python
# Example: Document query with isolation
def get_document(doc_id: str, workspace_id: str):
    """
    Cross-workspace access is prevented by:
    1. workspace_id comes from authenticated API key context
    2. Query explicitly filters by workspace_id
    3. No parameter allows overriding workspace_id
    """
    return db.documents.find_one({
        "id": doc_id,
        "workspace_id": workspace_id  # ISOLATION: Must match
    })
```

---

## 5. Configuration Precedence

```
┌─────────────────────────────────────────────────────────────────┐
│              CONFIGURATION RESOLUTION ORDER                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Level 1: Request Parameters (highest priority)                 │
│  ├─ temperature, top_p, max_tokens                             │
│  ├─ stream flag                                                │
│  └─ CLAMPED by workspace limits                                │
│                                                                 │
│  Level 2: Workspace Settings                                    │
│  ├─ RAG configuration                                          │
│  ├─ Enabled vaults                                             │
│  ├─ Rate limits                                                │
│  └─ Stored in MongoDB per workspace                            │
│                                                                 │
│  Level 3: System Defaults                                       │
│  ├─ Allowed models list                                        │
│  ├─ Max context window                                         │
│  ├─ Default RAG settings                                       │
│  └─ From environment/config file                               │
│                                                                 │
│  Resolution: L1 (clamped) → L2 → L3                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Observability Pipeline

### 6.1 Request Logging

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "correlation_id": "abc-123-def",
  "workspace_id": "ws_xxx",
  "api_key_id": "key_yyy",
  "method": "POST",
  "path": "/v1/chat/completions",
  "endpoint": "/v1/chat/completions",
  "status_code": 200,
  "duration_ms": 2450.5,
  "prompt_tokens": 1500,
  "completion_tokens": 320,
  "total_tokens": 1820,
  "rag_trace": {
    "vault_id": "vault_zzz",
    "chunks_retrieved": 5,
    "retrieval_latency_ms": 45.2,
    "sources": [
      {"document_id": "doc_aaa", "score": 0.92},
      {"document_id": "doc_bbb", "score": 0.88}
    ]
  }
}
```

### 6.2 Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `http_requests_total` | Counter | method, endpoint, status, workspace |
| `http_request_duration_seconds` | Histogram | method, endpoint |
| `llm_tokens_total` | Counter | provider, model, token_type, workspace |
| `rag_retrieval_duration_seconds` | Histogram | vault_type, workspace |
| `rag_chunks_retrieved` | Histogram | vault_type |
| `document_ingestion_total` | Counter | workspace, status |

---

## 7. Security Considerations

### 7.1 API Key Security

- Keys are hashed with Argon2 (never stored plaintext)
- Only shown once on creation (display then discard)
- Prefix stored for identification (first 8 chars)
- Automatic expiration support
- Revocation capability with audit trail

### 7.2 Secret Redaction

```python
# Fields automatically redacted from logs
REDACTED_FIELDS = [
    "api_key", "key", "token", "password", "secret",
    "authorization", "cookie", "x-api-key"
]
```

### 7.3 Rate Limiting

```python
class RateLimitConfig(BaseModel):
    """Non-billing rate limits per workspace."""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    tokens_per_minute: int = 100000
    concurrent_requests: int = 10
```

---

## 8. Explicit Non-Goals

The following are **intentionally NOT implemented** in Blocks 1-5:

| Feature | Reason |
|---------|--------|
| Billing/Subscriptions | Out of scope - this is BaaS, not SaaS |
| Payment processing | No financial transactions |
| Usage-based pricing | No cost allocation |
| Multi-user auth (OAuth) | Single API key per workspace |
| Frontend components | Backend-only infrastructure |
| Real-time collaboration | No WebSocket presence |
| Advanced RBAC | Simple permission list per key |
| Webhook delivery | No event subscriptions |

---

## 9. Migration Path

### Phase 1: Foundation (Block 1)
1. Implement APIKey model and hashing
2. Add API key middleware
3. Update workspace resolution
4. Backward compat: JWT still works for internal

### Phase 2: Storage (Block 2)
1. Implement Vault abstraction
2. Add global vault support
3. Migrate existing documents to vault model
4. Update ingestion pipeline

### Phase 3: Compute (Block 3)
1. Ensure OpenAI compatibility
2. Add RAG hooks to completions
3. Test workspace isolation

### Phase 4: Control (Block 4)
1. Implement config layers
2. Add validation and clamping
3. Create admin endpoints

### Phase 5: Observability (Block 5)
1. Add structured logging
2. Implement usage tracking
3. Create RAG tracing
4. Add metrics endpoints
