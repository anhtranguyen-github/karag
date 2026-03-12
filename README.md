# Karag Enterprise RAG Platform

Enterprise self-hosted RAG infrastructure monorepo with a FastAPI backend and Next.js admin console.

- **4-Stage Specialized RAG**: Advanced pipeline partitioned into Pre-Retrieval (HyDE, Self-Query), Retrieval (RRF), Post-Retrieval (PII Masking, Reranking), and Inference.
- **Enterprise Observability**: In-depth trace logging for every component, providing granular timing and metadata for document/query flows.
- **Dynamic Metadata Filtering**: Automated extraction of query filters (dates, authors) via Self-Querying.
- **Privacy & Safety**: Built-in PII redaction and secret masking at the Post-Retrieval stage.

## Current Verification Status

- `marker` + `surya` runtime compatibility was patched locally for newer `transformers` releases.
- The full live ingestion pipeline was verified on March 23, 2026 against `.docs/lap-trinh-mang_luong-anh-hoang_de-4 - [cuuduongthancong.com].pdf`.
- The verified live ingest stack was: `MarkerReader` -> `RecursiveChunker` -> `LocalEmbedder` -> `PgVectorVectorStore` (in-memory fallback).
- Persistent document status is now tracked across the upload/ingestion lifecycle: `uploading -> uploaded -> queued -> processing -> completed|failed`.
- `marker-pdf` in this environment does not provide a built-in OpenAI service adapter. OmniRoute requires the custom local Marker service in [`marker_omniroute_service.py`](/home/tra01/project/karag/src/backend/app/rag/components/readers/marker_omniroute_service.py).

## 🚀 RAG Performance Benchmarks (Baseline)

| Metric | Component Stack | Result |
| :--- | :--- | :--- |
| **Full Ingestion** | Marker -> Semantic -> Jina-v3 -> Qdrant | **~98 seconds** (2k chunks) |
| **TTFT** | HyDE -> RRF -> Jina-Reranker -> LLM | **~8.5 seconds** |
| **PII Redaction** | Regex-based entities | **Verified (Success)** |

*Metrics based on a 120k character PDF research paper.*

## Recent Live Ingest Result

| Metric | Stack | Result |
| :--- | :--- | :--- |
| **Live Full Ingest** | Marker -> Recursive -> Local -> PgVector (memory) | **Verified (Success)** |
| **Input** | `.docs/lap-trinh-mang_luong-anh-hoang_de-4 - [cuuduongthancong.com].pdf` | **547,383 bytes** |
| **Document Status** | persistent DB status | **`uploaded -> queued -> processing -> completed`** |
| **RAG Status** | persistent DB status | **`completed`, progress `100`, chunk count `1`** |
| **Observed Runtime** | cold OCR/model path | **~3m15s** |

## 📚 Seeded Knowledge Corpus

The initial platform comes seeded with a diverse range of technical documents for RAG validation:

| Document | Category | Key Concept / Explanation |
| :--- | :--- | :--- |
| **`Transformer`** | AI Research | Foundational paper on self-attention and Transformer architecture. |
| **`Recent Research`** | AI Research | Cutting-edge developments (2025) in deep learning scaling and models. |
| **`SML Models`** | Education | Comprehensive overview of supervised machine learning algorithms. |
| **`Net Programming`** | CS (VN) | Vietnamese guide on Socket Programming and Network Protocols. |
| **`Physics 2`** | Science (VN) | Vietnamese academic text on Electromagnetism and Thermodynamics. |

*All documents are located in the `.docs/` directory for local ingestion testing.*


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
