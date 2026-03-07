# Architectural Refactor Plan

## Target Shape

The target platform is a self-hostable RAG-focused BaaS with:

- modular provider registries
- workspace-aware runtime configuration
- OpenAI-compatible API endpoints
- reusable ingestion and retrieval pipelines
- explicit observability and control-plane boundaries
- a frontend admin console backed by one canonical SDK surface

## Execution Plan

1. Stabilize runtime composition.
   - Introduce explicit `config` and `observability` package boundaries.
   - Replace hard-coded provider branching with registries.

2. Centralize pipeline resolution.
   - Use one resolver for workspace defaults and dataset-specific pipeline overrides.
   - Reuse that resolver in both ingestion and retrieval.

3. Preserve OpenAI compatibility while tightening semantics.
   - Keep `/v1/chat/completions`, `/v1/embeddings`, `/v1/models`, and `/v1/files`.
   - Normalize workspace resolution across endpoints.

4. Retire legacy duplication incrementally.
   - Keep the current frontend SDK as the main API surface.
   - Migrate tests and compatibility code away from `src/frontend/src/lib/api/` before deleting it.

5. Extend the modular platform.
   - Add additional vector, storage, and model providers behind the registries.
   - Move shared contracts and SDK generation into `src/shared/`.
   - Consolidate agent graph and RAG graph orchestration into a single runtime layer.

## Phase Completed In This Change

- Added backend `config` and `observability` packages.
- Added provider registries and refactored the factory to use them.
- Added a shared RAG pipeline resolver for ingestion and retrieval.
- Fixed backend startup embedding-dimension initialization.
- Fixed embeddings endpoint workspace resolution.

## Residual Risks

- frontend legacy generated client still exists for compatibility with tests
- provider registries currently expose the providers already implemented in the codebase; additional backends still need adapters
- full orchestration unification is still a follow-up migration, not part of this patch
