# Karag Enterprise RAG Platform

Enterprise self-hosted RAG infrastructure monorepo with a FastAPI backend and Next.js admin console.

- **Core Architecture**: Foundational RAG, Tenancy, and Object Storage unified in `app.core`.
- **Modular RAG Pipeline**: Defaulting to high-accuracy `MarkerReader` + `RecursiveChunker` + `JinaReranker`.
- **Hybrid Retrieval**: Dense + Sparse search support with `QdrantVectorStore`.
- **Enterprise Storage**: S3-compatible storage service for document persistence.

## Monorepo structure

```text
src/
  backend/
    app/
      core/          # Foundational Kernel (RAG, Storage, Auth, DB)
      modules/       # Domain Logic (Workspaces, Chat, Organizations)
      api/           # Interface Layer (FastAPI routes)
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
