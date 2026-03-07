# Repository Architecture Analysis

## Current Architecture

The repository is already a `src/`-based monorepo:

- `src/backend`: FastAPI backend for multi-workspace RAG, ingestion, provider access, pipelines, and admin APIs
- `src/frontend`: Next.js admin console and developer UI
- `src/shared`: placeholder area for shared contracts and SDK artifacts
- root-level `openapi/`, `docker-compose.yml`, `k8s/`, `docs/`, and CI scripts support build and deployment

The backend already provides most of the intended RAG BaaS surface:

- document ingestion and storage
- embedding generation
- vector retrieval
- graph-backed RAG paths
- OpenAI-style `/v1/chat/completions`, `/v1/embeddings`, `/v1/models`, `/v1/files`
- workspace-aware settings and control-plane services
- structured logging, metrics, and tracing

## Legacy And Architectural Gaps

### Legacy code

- `src/frontend/src/lib/api/` is an older generated client surface that overlaps with the live `src/frontend/src/sdk/` entrypoint
- `src/backend/app/graph/` and `src/backend/app/rag/graph/` represent two orchestration layers with unclear boundaries
- root-level architecture docs described an earlier migration state and no longer matched the current code

### Unused or weakly used modules

- `src/frontend/src/lib/api/` appears to be mostly legacy compatibility code; the app imports `@/sdk` instead
- some root-level scripts and generated artifacts still encode old runtime assumptions but are not part of the active request path

### Duplicated logic

- provider selection was duplicated inside a single hard-coded factory rather than composed from registries
- ingestion and query flows both resolved pipeline configuration independently
- observability and config concerns existed, but were exposed through `core/` instead of explicit package boundaries

### Architecture inconsistencies

- the backend had a modular directory tree, but runtime composition was still centralized in a few monolithic files
- pipeline configuration existed in both workspace settings and dataset-bound pipeline records without a single resolver
- OpenAI-compatible model parsing mixed workspace names and workspace IDs across endpoints
- the frontend had two generated client concepts (`lib/api` and `sdk/generated`) instead of a single canonical client surface

## Refactor Direction Applied

This refactor focused on the live backend composition layer first:

- introduced explicit `config` and `observability` packages as stable import boundaries
- replaced hard-coded provider construction with registry-backed provider resolution
- introduced a shared RAG pipeline resolver used by both ingestion and retrieval flows
- fixed backend startup to use the actual embedding dimension source from typed settings
- fixed OpenAI-compatible embeddings resolution to map model workspace names to workspace IDs consistently

## Remaining Follow-Up

- migrate or remove the legacy frontend generated client after test fixtures are moved off `src/frontend/src/lib/api/`
- collapse `app/graph` and `app/rag/graph` behind a single orchestration boundary
- add more provider implementations behind the new registries, especially storage and alternative vector stores
- move shared OpenAPI contract and SDK generation fully into `src/shared/`
