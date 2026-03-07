# Architectural Refactor Plan

## Current Architecture

- The repository is a split monorepo with a Python FastAPI backend and a Next.js frontend, plus deployment, CI, and documentation assets at the root.
- The backend already contains many BaaS-oriented capabilities: multi-workspace support, provider abstractions, ingestion, vector storage, telemetry, and an OpenAI-style chat/models layer.
- The frontend already contains an admin console, workspace management, document management, and SDK-driven API access.

## Legacy And Inconsistencies

- Backend imports are hard-coded to `backend.app...`, which tightly couples module layout to the old directory root.
- The frontend mixes three API access patterns: `src/sdk/generated`, `src/lib/api`, and imports from a missing `@/client`.
- Graph execution is split between `app/graph` and `app/rag/graph`, which makes agent vs. RAG orchestration boundaries unclear.
- Control-plane and data-plane code are mixed in the same router namespace and service layer.
- Build, CI, Docker, and shell scripts assumed `backend/` and `frontend/` at the repository root.

## Duplicate Or Obsolete Areas

- `src/frontend/src/lib/api` duplicates generated client responsibilities already covered by `src/frontend/src/sdk/generated`.
- `src/frontend/src/sdk` and `@/client` were overlapping abstractions without a stable single entrypoint.
- `src/backend/app/graph` and `src/backend/app/rag/graph` duplicate workflow concepts with different scopes.
- Root-level path references in CI/docs/scripts duplicated environment knowledge and were brittle during moves.

## Target Refactor Direction

- Move runtime projects under `src/backend` and `src/frontend`.
- Keep a single Python package import root at `src.backend`.
- Keep a single frontend generated-client surface at `src/frontend/src/client`, backed by `src/frontend/src/sdk/generated`.
- Expand the OpenAI-compatible API surface beyond chat/models to include embeddings/files.
- Preserve existing workspace-aware services while reorganizing the repository toward a modular RAG BaaS platform.

## Execution Plan

1. Move backend and frontend into `src/` and update imports, Docker, CI, scripts, and test paths.
2. Keep the current backend implementation running under the new package root `src.backend`.
3. Add missing OpenAI-compatible endpoints for embeddings and files.
4. Consolidate frontend API access behind a single client entrypoint and retire the missing-client inconsistency.
5. Introduce `src/shared/` as the shared contract area for SDK and type artifacts.
6. Follow up by incrementally separating orchestration, providers, observability, and configuration into clearer bounded modules.
