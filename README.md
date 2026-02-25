# Karag

An advanced, enterprise-grade, multi-workspace RAG (Retrieval-Augmented Generation) and Agentic chatbot platform designed for deep document analysis, intelligent conversation, and comprehensive administrative control.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/frontend-Next.js%2015-black)
![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688)
![DevSecOps](https://img.shields.io/badge/DevSecOps-Jenkins%20%7C%20SonarQube-orange)

## Features

- **Multi-Workspace Architecture**: Organize documents and chats into isolated workspaces with independent settings, Vector DB collections, and Knowledge Graphs.
- **Master Intelligence Vault**: Centralized console for cross-workspace document management, deduplication, and global purging.
- **Intelligent Agentic Chat**: Converse with your data using dynamic execution modes powered by LangGraph:
  - **Fast**: Direct LLM response and rapid answers.
  - **Think**: Deep reasoning and vector retrieval step-by-step thinking.
  - **Deep**: Full multi-agent research with comprehensive web searches, tool use, and complex data synthesization.
- **Global Search**: Unified semantic and keyword hybrid search across documents, chat history, and workspaces.
- **Advanced RAG Engines**: Integrated support for Vector Search (Qdrant) and Graph-based RAG (Neo4j).
- **Admin Console**: Centralized system control center for managing providers (LLM/Embedding), user roles, global parameters, observability, and infrastructure health.
- **Provider Agnostic**: Configurable support for OpenAI, Anthropic, Ollama, vLLM, and Llama.cpp with dynamic metadata discovery for both LLM and Embedding tasks.
- **On-Demand Neural Indexing**: RAG ingestion lazy-loading and background-worker synchronization for processing heavy PDFs, web imports, and GitHub repositories.

## Operations, DevSecOps & Monitoring

Karag is built for production-grade dependability, observability, and reliable operations out-of-the-box.

- **DevSecOps Pipeline**: Fully integrated CI/CD setup via **Jenkins** with GitHub Actions fallback.
  - **Static Analysis**: TypeScript validation, Next.js linting, and Python `ruff` formatting.
  - **Security Audits**: Continuous secret scanning (`TruffleHog`) and Infrastructure-as-Code compliance scanning (`Checkov`).
  - **Code Quality**: Deep static analysis and coverage measurement via **SonarQube**.
- **Observability Stack**:
  - **Structured Logging**: `structlog` implemented for JSON-formatted, context-rich logs.
  - **Distributed Tracing**: Fully instrumented OpenTelemetry (OTEL) traces visualized through **Jaeger**.
  - **Metrics**: Real-time system health tracking via **Prometheus**.
- **Modular Runner (`run.sh`)**: A high-level, self-healing orchestration CLI for managing the entire Local + Cloud stack ecosystem, automatically handling zombie processes, port collisions, and docker lifecycle hooks.

## Architecture

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Framer Motion, and shadcn/ui.
- **Backend**: FastAPI (Python 3.10+), LangGraph, LangChain, and Pydantic.
- **Database & Services Infrastructure**:
  - **Qdrant**: High-performance semantic vector database.
  - **MongoDB**: For persistence of users, sessions, workspace metadata, and chat history.
  - **MinIO**: S3-compatible object storage for high-speed document asset persistence.
  - **Neo4j**: Optional Knowledge Graph backend for GraphRAG context mapping.
  - **Local Models**: Containerized profiles for `Ollama`, `vLLM`, and `llama-cpp`.

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose** (V2)
- **pnpm** (for frontend development)
- **uv** (for fast backend dependency installation via Python)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/anhtranguyen-github/karag.git
   cd karag
   ```

2. **Setup Environment**:
   Duplicate or create a `.env` file in the root directory:
   ```env
   # API Keys
   OPENAI_API_KEY=your_key_here

   # Cloud/Local Infrastructure Overrides (Defaults point to localhost Docker)
   MONGO_URI=mongodb://localhost:27017
   QDRANT_URL=http://localhost:6333
   NEO4J_URI=bolt://localhost:7687
   # ... See .env for more
   ```

3. **Run the Application**:
   Use the `run.sh` script to streamline starting up the multi-container environment gracefully:

   ```bash
   chmod +x run.sh
   
   # Quick Start: Boot databases, sync packages, and start the app
   ./run.sh quick
   
   # Full Production Start: Verify correctness (type-checking, linting, tests) then boot
   ./run.sh up
   
   # Cloud-First Mode: Skips booting local GPU model containers (vLLM/Ollama) to save memory
   ./run.sh up --lite
   ```

   **Runner CLI Commands:**
   - `up`: (Default) Verify code, start infrastructure, and launch the platform.
   - `quick`: Rapid launch omitting heavy DevSecOps profiling and verification tasks.
   - `verify`: Run correctness checks (linting, typing, imports) locally.
   - `test`: Run backend and frontend automated test suites.
   - `clean`: Stops all processes, containers, and purges `.venv` / `node_modules` caches.
   - `stop`: Gracefully downs the application stack.
   - `status`: Heartbeat dashboard of all platform dependencies.

## Development

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev
```

### Backend
```bash
# Install uv toolchain
curl -LsSf https://astral.sh/uv/install.sh | sh

cd backend
uv sync
uv run app/main.py
```

## Testing

The project is governed by strict end-to-end testing suites.

### Backend Tests
```bash
cd backend
uv run pytest tests/unit -v
```

### Frontend Tests
```bash
cd frontend
pnpm run test         # Vitest unit & component matching
pnpm run type-check   # Validate TS boundaries
```

## Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️ for AI Engineers & Data Scientists.
