# BaaS Core Migration Guide

## Overview

This guide describes the incremental migration path from the existing Karag system to the BaaS core architecture (Blocks 1-5).

## Current State vs Target State

| Aspect | Current State | BaaS Target |
|--------|--------------|-------------|
| **Auth** | JWT-based (user login) | API Key-based (workspace-scoped) |
| **Isolation** | Query-param workspace_id | Middleware-injected context |
| **Storage** | Direct workspace collections | Vault abstraction layer |
| **Config** | settings.json + env | Layered (System → Workspace → Request) |
| **Observability** | Basic logging | Structured logs + RAG traces |

---

## Phase 1: Block 1 - Identity & Access (Week 1)

### 1.1 Database Migration

```javascript
// MongoDB migration script
// Create api_keys collection
db.createCollection("api_keys", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "workspace_id", "key_hash", "key_prefix"],
      properties: {
        id: { bsonType: "string" },
        workspace_id: { bsonType: "string" },
        key_hash: { bsonType: "string" },
        key_prefix: { bsonType: "string" },
        permissions: { bsonType: "array", items: { bsonType: "string" } },
        is_active: { bsonType: "bool" },
        created_at: { bsonType: "date" },
        expires_at: { bsonType: "date" }
      }
    }
  }
});

// Create indexes
db.api_keys.createIndex({ "key_prefix": 1 });
db.api_keys.createIndex({ "workspace_id": 1 });
db.api_keys.createIndex({ "is_active": 1 });
```

### 1.2 API Key Generation for Existing Workspaces

```python
# Script: scripts/migrate_api_keys.py
"""
Generate initial API keys for existing workspaces.
Run once during migration.
"""

import asyncio
from backend.app.services.api_key_service import api_key_service
from backend.app.core.mongodb import mongodb_manager

async def migrate_existing_workspaces():
    db = mongodb_manager.get_async_database()
    
    # Find all existing workspaces
    workspaces = await db.workspaces.find({}).to_list(None)
    
    for ws in workspaces:
        workspace_id = ws["id"]
        
        # Check if keys already exist
        existing = await db.api_keys.find_one({"workspace_id": workspace_id})
        if existing:
            print(f"Skipping {workspace_id} - keys already exist")
            continue
        
        # Create default key
        key_response = await api_key_service.create_key(
            workspace_id=workspace_id,
            permissions=["read", "write", "delete", "admin"],
            description="Migrated from existing workspace"
        )
        
        print(f"Workspace: {workspace_id}")
        print(f"  API Key: {key_response.api_key}")
        print(f"  Key ID: {key_response.id}")
        print()

if __name__ == "__main__":
    asyncio.run(migrate_existing_workspaces())
```

### 1.3 Middleware Registration

```python
# In backend/app/main.py, add to app initialization

from backend.app.api.baas_deps import get_isolation_context
from backend.app.services.api_key_service import api_key_service

# Add cleanup task for expired keys
@app.on_event("startup")
async def startup_tasks():
    # ... existing tasks ...
    
    # Clean up expired API keys
    await api_key_service.cleanup_expired_keys()
```

### 1.4 Backward Compatibility

JWT authentication remains functional for existing endpoints:

```python
# In deps.py, maintain backward compatibility

async def get_current_user_or_api_key(
    jwt_user: Annotated[Optional[dict], Depends(get_current_user)],
    api_context: Annotated[Optional[IsolationContext], Depends(get_isolation_context)]
):
    """
    Accept either JWT (legacy) or API key (new).
    
    Migration phase only - eventually remove JWT for external APIs.
    """
    if api_context:
        return {"type": "api_key", "context": api_context}
    if jwt_user:
        return {"type": "jwt", "user": jwt_user}
    
    raise HTTPException(status_code=401, detail="Authentication required")
```

---

## Phase 2: Block 2 - Data & Storage (Week 2)

### 2.1 Vault Collection Migration

```javascript
// MongoDB migration script

db.createCollection("vaults", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "type", "name"],
      properties: {
        id: { bsonType: "string" },
        type: { enum: ["global", "workspace"] },
        owner_workspace_id: { bsonType: ["string", "null"] },
        name: { bsonType: "string" },
        is_active: { bsonType: "bool" },
        is_read_only: { bsonType: "bool" }
      }
    }
  }
});

// Migrate existing workspaces to have default vaults
db.workspaces.find().forEach(function(ws) {
  var vaultId = "vault_" + ws.id.replace("ws_", "");
  
  db.vaults.insertOne({
    id: vaultId,
    type: "workspace",
    owner_workspace_id: ws.id,
    name: "default",
    description: "Default vault for workspace",
    is_active: true,
    is_read_only: false,
    vector_store_config: {
      collection_name: "ws_" + ws.id + "_kb",
      dimension: 1536,
      distance_metric: "cosine"
    },
    file_store_config: {
      bucket: "rag-docs",
      prefix: "workspaces/" + ws.id + "/"
    },
    created_at: new Date(),
    updated_at: new Date()
  });
  
  // Update workspace
  db.workspaces.updateOne(
    { _id: ws._id },
    { 
      $set: { 
        vault_ids: [vaultId],
        enabled_vaults: [vaultId]
      }
    }
  );
});
```

### 2.2 Document Migration

```python
# Add vault_id to existing documents
async def migrate_documents_to_vaults():
    db = mongodb_manager.get_async_database()
    
    async for doc in db.documents.find({"vault_id": {"$exists": False}}):
        workspace_id = doc.get("workspace_id", "default")
        
        # Find or create vault for this workspace
        vault = await db.vaults.find_one({
            "owner_workspace_id": workspace_id,
            "name": "default"
        })
        
        if vault:
            # Update document with vault_id
            await db.documents.update_one(
                {"_id": doc["_id"]},
                {"$set": {"vault_id": vault["id"]}}
            )
```

### 2.3 Vector Store Migration

```python
# Rename existing collections to vault naming convention
async def migrate_vector_collections():
    """
    Rename existing Qdrant collections to vault naming.
    
    Old: "knowledge_base_1536"
    New: "ws_{workspace_id}_kb"
    """
    from backend.app.rag.store.qdrant import qdrant_client
    
    # Get all workspace vaults
    db = mongodb_manager.get_async_database()
    vaults = await db.vaults.find({"type": "workspace"}).to_list(None)
    
    for vault in vaults:
        collection_name = vault["vector_store_config"]["collection_name"]
        
        # Check if old collection exists
        old_collection = "knowledge_base_1536"
        
        # Create new collection if needed
        # Note: Actual migration depends on Qdrant capabilities
        # May require re-indexing
```

---

## Phase 3: Block 3 - Compute & APIs (Week 3)

### 3.1 OpenAI Compatibility Layer

The existing `/v1/completions` endpoint already supports OpenAI format.
Updates needed:

1. Add API key authentication option
2. Inject workspace context from API key
3. Add RAG trace logging

```python
# In backend/app/api/v1/completions.py

from backend.app.api.baas_deps import IsolationContextDep, get_isolation_context
from backend.app.services.usage_service import usage_service
from backend.app.services.config_service import config_service

@router.post("/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    isolation_context: IsolationContextDep,  # New: API key auth
    # ... existing params ...
):
    workspace_id = isolation_context.workspace_id
    
    # Resolve configuration
    config = await config_service.resolve_request_config(
        workspace_id=workspace_id,
        request_config=RequestConfig(
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            # ...
        )
    )
    
    # ... existing completion logic ...
    
    # Log usage
    await usage_service.log_request(
        correlation_id=correlation_id,
        workspace_id=workspace_id,
        api_key_id=isolation_context.api_key_id,
        # ...
    )
```

---

## Phase 4: Block 4 - Control Plane (Week 4)

### 4.1 Configuration Collections

```javascript
// MongoDB migration script

db.createCollection("system_config", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id"],
      properties: {
        id: { bsonType: "string" },
        allowed_models: { bsonType: "array" },
        max_context_window: { bsonType: "int" },
        max_tokens_per_request: { bsonType: "int" }
      }
    }
  }
});

db.createCollection("workspace_configs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["workspace_id"],
      properties: {
        workspace_id: { bsonType: "string" },
        enabled_vaults: { bsonType: "array" },
        rag_config: { bsonType: "object" }
      }
    }
  }
});
```

### 4.2 Initialize System Config

```python
# On startup, ensure system config exists
from backend.app.services.config_service import config_service

async def init_system_config():
    await config_service.initialize_system_config()
```

---

## Phase 5: Block 5 - Observability (Week 5)

### 5.1 Usage Logs Collection

```javascript
// MongoDB migration script

db.createCollection("usage_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "timestamp", "workspace_id"],
      properties: {
        id: { bsonType: "string" },
        timestamp: { bsonType: "date" },
        workspace_id: { bsonType: "string" },
        api_key_id: { bsonType: "string" },
        method: { bsonType: "string" },
        path: { bsonType: "string" },
        status_code: { bsonType: "int" },
        duration_ms: { bsonType: "double" }
      }
    }
  }
});

// Create indexes
db.usage_logs.createIndex({ "timestamp": -1 });
db.usage_logs.createIndex({ "workspace_id": 1, "timestamp": -1 });
db.usage_logs.createIndex({ "api_key_id": 1 });
db.usage_logs.createIndex({ "correlation_id": 1 });

// TTL index for automatic cleanup (90 days)
db.usage_logs.createIndex(
  { "timestamp": 1 },
  { expireAfterSeconds: 7776000 }
);
```

### 5.2 Middleware Integration

```python
# In backend/app/core/middleware.py

from backend.app.services.usage_service import usage_service

class ObservabilityMiddleware:
    async def dispatch(self, request, call_next):
        # ... existing code ...
        
        # After request completes
        try:
            # Get isolation context if available
            isolation_context = getattr(request.state, "isolation_context", None)
            
            if isolation_context:
                await usage_service.log_request(
                    correlation_id=correlation_id,
                    workspace_id=isolation_context.workspace_id,
                    api_key_id=isolation_context.api_key_id,
                    method=request.method,
                    path=request.url.path,
                    endpoint=self._normalize_path(request.url.path),
                    status_code=status_code,
                    duration_ms=duration_ms,
                    # ... token counts from response if available ...
                )
        except Exception as e:
            logger.error("usage_logging_failed", error=str(e))
```

---

## Rollback Plan

### If Issues Occur

1. **Revert to JWT Auth**: Remove API key middleware, restore JWT-only
2. **Keep Old Collections**: Don't delete old collections until migration verified
3. **Feature Flags**: Use flags to disable new features

```python
# Feature flag example
BAAS_ENABLED = os.getenv("BAAS_ENABLED", "false").lower() == "true"

if BAAS_ENABLED:
    from backend.app.api.baas_deps import get_isolation_context
else:
    from backend.app.api.deps import get_current_user as get_isolation_context
```

---

## Testing Checklist

### Block 1: Identity
- [ ] API key generation works
- [ ] API key validation works
- [ ] Wrong key returns 401
- [ ] Expired key returns 401
- [ ] Revoked key returns 401
- [ ] Workspace isolation enforced

### Block 2: Storage
- [ ] Global vault accessible (read-only)
- [ ] Workspace vault isolated
- [ ] Cross-workspace access blocked
- [ ] Document CRUD works
- [ ] Vector search works per vault

### Block 3: Compute
- [ ] OpenAI compatibility maintained
- [ ] RAG works with vault context
- [ ] Configuration clamping works
- [ ] Streaming responses work

### Block 4: Control
- [ ] System config updates work
- [ ] Workspace config updates work
- [ ] Config precedence correct
- [ ] Validation catches invalid configs

### Block 5: Observability
- [ ] Request logs written
- [ ] Token usage tracked
- [ ] RAG traces recorded
- [ ] Sensitive data redacted
- [ ] Stats aggregation works

---

## Post-Migration

After successful migration:

1. **Remove Legacy Code** (2 weeks after stable)
   - Remove JWT from external APIs
   - Remove old workspace resolution
   - Remove settings.json fallback

2. **Optimize** (1 month after)
   - Add usage log archival
   - Implement rate limiting enforcement
   - Add alerting on error rates

3. **Documentation Updates**
   - Update API documentation
   - Create user guides for API keys
   - Document admin endpoints
