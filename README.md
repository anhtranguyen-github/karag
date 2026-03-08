# Karag Enterprise RAG Platform

Enterprise self-hosted RAG infrastructure monorepo with a FastAPI backend and Next.js admin console.

## What is implemented

- Workspace-aware tenant context built on `organization_id`, `project_id`, and `workspace_id`
- Split dataset architecture:
  - `KnowledgeDataset` for document ingestion and retrieval
  - `EvaluationDataset` for benchmark questions and evaluation runs
- Pluggable backend interfaces for:
  - `VectorStore`
  - `StorageProvider`
  - `EventBus`
  - `EmbeddingProvider`
  - `LLMProvider`
- Internal event bus with typed envelopes and transactional outbox staging
- Model registry scaffold with models, versions, artifacts, and workspace-scoped deployments
- Runtime RAG endpoints, observability summary endpoint, and frontend console sections

## Monorepo structure

```text
src/
  backend/
    app/
      adapters/
      core/
      modules/
  frontend/
    src/
      app/
      components/
deploy/
  helm/
  kong/
  otel/
  prometheus/
```

## Quick start

### Backend

```bash
cd src/backend
uv sync
uv run pytest
uv run uvicorn app.main:app --reload
```

### Frontend

```bash
cd src/frontend
pnpm install
pnpm dev
```

### Docker Compose

```bash
docker compose --profile cpu up --build
```

Add the GPU profile if you want to include `vllm`:

```bash
docker compose --profile cpu --profile gpu up --build
```

## Primary API surfaces

- Admin:
  - `/api/v1/knowledge-datasets`
  - `/api/v1/evaluation-datasets`
  - `/api/v1/models`
  - `/api/v1/observability/summary`
- Runtime:
  - `/v1/models`
  - `/v1/embeddings`
  - `/v1/chat/completions`
  - `/v1/rag/query`
  - `/v1/retrieval/debug`

## Notes

- The current implementation is an execution-ready scaffold: the boundaries, contracts, and API surface are in place, with in-memory default adapters behind production-facing interfaces.
- Qdrant, MinIO, Redis Streams, Ollama, and the OpenTelemetry stack remain the default infrastructure direction.
