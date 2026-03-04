# BaaS Core Implementation Summary

## Project Overview

This implementation adds a complete Backend-as-a-Service (BaaS) core to Karag, covering Blocks 1-5 as specified:

1. **Block 1: Identity & Access** - API key authentication with workspace isolation
2. **Block 2: Data & Storage** - Vault abstraction for document/knowledge storage
3. **Block 3: Compute & APIs** - OpenAI-compatible inference with RAG
4. **Block 4: Control Plane** - Layered configuration (System → Workspace → Request)
5. **Block 5: Observability** - Structured logging, usage tracking, RAG tracing

---

## Files Created

### 1. Data Models (`backend/app/schemas/baas.py`)

Authoritative data models for all BaaS entities:

| Model | Purpose | Block |
|-------|---------|-------|
| `Workspace` | Isolation boundary | 1 |
| `APIKey` | Authentication credential | 1 |
| `Vault` | Storage abstraction (global/workspace) | 2 |
| `Document` | File metadata | 2 |
| `Chunk` | Text segment with embedding | 2 |
| `RAGConfig` | Retrieval configuration | 4 |
| `SystemConfig` | Operator-level settings | 4 |
| `WorkspaceConfig` | Workspace-level settings | 4 |
| `RequestConfig` | Request-level overrides | 4 |
| `UsageLog` | Request telemetry | 5 |
| `RAGTrace` | RAG operation details | 5 |

### 2. Services

#### API Key Service (`backend/app/services/api_key_service.py`)
- Key generation with Argon2 hashing
- Key validation and workspace resolution
- Permission checking
- Revocation and cleanup

#### Vault Service (`backend/app/services/vault_service.py`)
- Global vault management (read-only, shared)
- Workspace vault creation and isolation
- Access control enforcement
- Collection naming for isolation

#### Configuration Service (`backend/app/services/config_service.py`)
- System config (operator-only)
- Workspace config (restricted)
- Request config resolution with clamping
- Validation and precedence handling

#### Usage Service (`backend/app/services/usage_service.py`)
- Structured request logging
- Token usage tracking
- RAG trace creation
- Statistics aggregation
- Sensitive data redaction

### 3. Dependencies (`backend/app/api/baas_deps.py`)

FastAPI dependencies for:
- API key extraction from headers
- Workspace context injection
- Permission requirements (read/write/delete/admin)
- Backward compatibility with existing JWT auth

### 4. Admin API (`backend/app/api/v1/baas_admin.py`)

Control plane endpoints:
- `POST /admin/baas/workspaces/{id}/api-keys` - Create API key
- `GET /admin/baas/workspaces/{id}/api-keys` - List keys
- `DELETE /admin/baas/api-keys/{id}` - Revoke key
- `GET/PUT /admin/baas/system/config` - System config
- `GET/PUT /admin/baas/workspaces/{id}/config` - Workspace config
- `GET /admin/baas/usage/logs` - Query usage logs
- `GET /admin/baas/usage/workspaces/{id}/stats` - Usage stats

### 5. Documentation

- `docs/BaaS-ARCHITECTURE.md` - Complete architecture overview
- `docs/BaaS-MIGRATION.md` - Step-by-step migration guide
- `docs/BaaS-IMPLEMENTATION-SUMMARY.md` - This document

---

## Key Design Decisions

### 1. Isolation Model

**Decision**: Every request resolves to exactly one workspace via API key.

**Implementation**:
```python
# Middleware extracts workspace from API key
context = await api_key_service.validate_key(api_key)
# context.workspace_id is used for ALL data queries
```

**Benefits**:
- No workspace_id parameter needed in requests
- Impossible to accidentally access other workspaces
- Clear audit trail (api_key_id in every log)

### 2. Vault Abstraction

**Decision**: Two vault types with different access patterns.

| Type | Access | Use Case |
|------|--------|----------|
| Global | Read-only, all workspaces | Platform knowledge |
| Workspace | Full CRUD, isolated | Private documents |

**Implementation**:
- Collection naming: `ws_{workspace_id}_kb`
- Explicit vault_type check prevents global writes

### 3. Configuration Precedence

**Decision**: Three-layer configuration with clamping.

```
Request (user input)
    ↓ (clamped by)
Workspace (admin set)
    ↓ (falls back to)
System (operator set)
```

**Example**:
- System: max_tokens = 4096
- Workspace: default_max_tokens = 2048
- Request: max_tokens = 8192 → clamped to 4096

### 4. Observability

**Decision**: Structured logging with automatic redaction.

**Redaction**:
- API keys: Never logged (only key_id)
- Client IPs: SHA-256 hashed
- User agents: SHA-256 hashed
- Request bodies: Scanned for sensitive fields

---

## Isolation Enforcement Points

Cross-workspace access is prevented at multiple layers:

```
┌─────────────────────────────────────────────────────────────┐
│  1. AUTHENTICATION                                           │
│     - API key → workspace_id lookup                          │
│     - Wrong key = 401 Unauthorized                           │
├─────────────────────────────────────────────────────────────┤
│  2. AUTHORIZATION                                            │
│     - Check key permissions                                  │
│     - Insufficient = 403 Forbidden                           │
├─────────────────────────────────────────────────────────────┤
│  3. DATA ACCESS                                              │
│     - MongoDB: {"workspace_id": "ws_xxx"} filter            │
│     - Vector: workspace-scoped collection                    │
├─────────────────────────────────────────────────────────────┤
│  4. VAULT ACCESS                                             │
│     - Global vault: read-only enforcement                    │
│     - Workspace vault: ownership check                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Non-Goals (Explicitly NOT Implemented)

Per requirements, the following are excluded:

| Feature | Reason |
|---------|--------|
| Billing/Subscriptions | Out of scope - this is BaaS infrastructure |
| Payment processing | No financial transactions |
| Usage-based pricing | No cost allocation logic |
| Multi-user OAuth | Simple API key per workspace |
| Frontend components | Backend-only |
| Real-time collaboration | No WebSocket presence |
| Advanced RBAC | Simple permission list |
| Webhook delivery | No event subscriptions |

---

## Migration Path

The implementation includes a complete migration guide (`docs/BaaS-MIGRATION.md`) with:

1. **Phase 1** (Week 1): Database migrations, API key generation, middleware
2. **Phase 2** (Week 2): Vault migration, document updates
3. **Phase 3** (Week 3): OpenAI compatibility, RAG integration
4. **Phase 4** (Week 4): Configuration layer setup
5. **Phase 5** (Week 5): Observability pipeline

Each phase includes:
- MongoDB migration scripts
- Python migration scripts
- Rollback procedures
- Testing checklists

---

## Testing Strategy

### Unit Tests Needed

```python
# Test isolation
async def test_cross_workspace_access_blocked():
    ws1_key = await create_key("ws_1")
    ws2_doc = await create_document("ws_2")
    
    # Should fail
    with pytest.raises(AuthorizationError):
        await get_document(ws2_doc.id, workspace_id="ws_1")

# Test config clamping
async def test_max_tokens_clamped():
    system_max = 4096
    request_tokens = 10000
    
    resolved = await resolve_config(workspace_id="ws_1", max_tokens=request_tokens)
    assert resolved["max_tokens"] == system_max

# Test API key security
async def test_key_hashing():
    response = await create_key("ws_1")
    key = response.api_key
    
    # Verify we can't retrieve the key again
    keys = await list_keys("ws_1")
    assert all(k.key_hash != key for k in keys)
```

### Integration Tests Needed

- End-to-end request with API key
- RAG query with vault scoping
- Configuration resolution chain
- Usage log creation and querying

---

## OpenAI Compatibility

The existing `/v1/chat/completions` endpoint is maintained with enhancements:

```python
# Before (existing)
POST /v1/chat/completions
Authorization: Bearer <jwt_token>
Body: {"model": "gpt-4o", "messages": [...]}

# After (with API key)
POST /v1/chat/completions
Authorization: Bearer <api_key>
Body: {"model": "gpt-4o", "messages": [...]}

# Workspace determined from API key
# RAG enabled if model starts with "karag:"
```

---

## Security Considerations

### API Key Security
- Argon2 hashing (memory-hard)
- Only prefix stored for identification
- Full key shown only once on creation
- Automatic expiration support
- Revocation with audit trail

### Data Isolation
- Workspace ID in every query
- Collection-level isolation in vector store
- Vault-level access control
- No global mutable state

### Secret Redaction
```python
REDACTED_FIELDS = [
    "api_key", "key", "token", "password", "secret",
    "authorization", "cookie", "x-api-key"
]
```

---

## Performance Considerations

### Database
- Indexes on `api_keys.key_prefix` for fast lookup
- Indexes on `usage_logs.workspace_id + timestamp`
- TTL index for automatic log cleanup (90 days)

### Caching
- System config cached in memory
- Workspace config cached with TTL
- API key validation results cached briefly

### Vector Store
- Per-workspace collections prevent cross-tenant queries
- Collection naming convention enables fast lookup

---

## Next Steps

1. **Review**: Architecture and data models with stakeholders
2. **Database Migration**: Run MongoDB migration scripts
3. **API Key Generation**: Create keys for existing workspaces
4. **Gradual Rollout**: Enable per-workspace with feature flags
5. **Monitoring**: Watch error rates and performance
6. **Documentation**: Update API docs and user guides

---

## File Reference

```
backend/
├── app/
│   ├── schemas/
│   │   └── baas.py              # Data models (Blocks 1,2,4,5)
│   ├── services/
│   │   ├── api_key_service.py   # Block 1: Authentication
│   │   ├── vault_service.py     # Block 2: Storage
│   │   ├── config_service.py    # Block 4: Configuration
│   │   └── usage_service.py     # Block 5: Observability
│   ├── api/
│   │   ├── baas_deps.py         # Dependencies & middleware
│   │   └── v1/
│   │       └── baas_admin.py    # Admin endpoints
│   └── main.py                  # Add startup initializations
docs/
├── BaaS-ARCHITECTURE.md         # Architecture overview
├── BaaS-MIGRATION.md            # Migration guide
└── BaaS-IMPLEMENTATION-SUMMARY.md  # This file
```

---

## Compliance Notes

- **No PII**: Client IPs and user agents are hashed
- **Audit Trail**: Every request logged with workspace attribution
- **Access Control**: Deny-by-default with explicit permissions
- **Data Retention**: Configurable TTL for usage logs (default 90 days)
