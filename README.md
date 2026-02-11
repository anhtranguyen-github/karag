# ScienChan

An advanced, multi-workspace RAG (Retrieval-Augmented Generation) chat application designed for deep document analysis and intelligent conversation.

## Visual Tour

### Workspaces Dashboard
Unified entry point to all your intelligence sectors.
![Workspaces Dashboard](assets/screenshots/workspaces_dashboard.png)

### Intelligent Chat Interface
Deep reasoning and source-cited conversation layer.
![Chat Interface](assets/screenshots/chat_interface.png)

### Master Intelligence Vault
Cross-workspace document orchestration and global state management.
![Master Vault](assets/screenshots/master_vault.png)

### Document Management
Granular control over paper ingestion and vector metadata.
![Document Management](assets/screenshots/document_management.png)

### Workspace Overview
Analytical summary of specific research projects.
![Workspace Overview](assets/screenshots/workspace_overview.png)

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/frontend-Next.js%2015-black)
![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688)
![CI/CD](https://img.shields.io/badge/cicd-Jenkins-orange)

## Features

- **Multi-Workspace Architecture**: Organize documents and chats into isolated workspaces with independent settings.
- **Master Intelligence Vault**: Centralized console for cross-workspace document management, sharing, and global purging.
- **Intelligent Chat**: Converse with your data using multiple modes:
  - **Fast**: Quick, direct responses.
  - **Thinking**: More thorough analysis.
  - **Reasoning**: Full chain-of-thought with detailed source citations.
- **Global Search**: Unified search across documents, chat history, and workspaces.
- **Advanced RAG Engines**: Support for various retrieval strategies including Vector search and Graph-based RAG.
- **Document Ingestion**: Asynchronous, non-blocking ingestion of PDFs, Markdown, and ArXiv papers with background tracking, automated deduplication, and global vault persistence.
- **Premium UI/UX**: Unified typography using the **Outfit** font and a dark-mode first design aesthetic.
- **Provider Agnostic**: Configurable support for OpenAI, Anthropic, Ollama, and more.

## CI/CD Pipeline

The project implements a robust **DevOps / CI/CD pipeline** via Jenkins:

- **Source Control**: Automated triggers on GitHub push/commit events.
- **Unit Testing**: Pre-build verification using `pytest`.
- **Code Quality**: Static analysis and security scanning via **SonarQube**.
- **IaC Security**: Infrastructure-as-Code scanning using **Checkov** (fails on HIGH/CRITICAL findings).
- **Dockerization**: Automated building of production-ready Docker images.

See `Jenkinsfile` and `sonar-project.properties` for configuration details.

## Architecture

- **Frontend**: Next.js (App Router), Tailwind CSS, Framer Motion, and Lucide React.
- **Backend**: FastAPI, LangGraph for orchestration, and LangChain for LLM integration.
- **Data Stores**:
  - **Qdrant**: High-performance vector database for semantic search and global vault deduplication.
  - **MongoDB**: For session management, workspace metadata, and chat history.
  - **MinIO**: S3-compatible object storage for paper/document persistence with deduplicated storage.

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose**
- **pnpm** (for frontend)
- **Python 3.10+** (for backend)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/anhtranguyen-github/ScienChan.git
   cd ScienChan
   ```

2. **Setup Environment**:
   Create a `.env` file in the root and add your configuration:
   ```env
   # Backend
   OPENAI_API_KEY=your_key_here
   MONGODB_URL=mongodb://localhost:27017
   QDRANT_URL=http://localhost:6333
   
   # MinIO
   MINIO_ENDPOINT=localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   ```

3. **Run the Application**:
   Use the modular runner script for a self-healing development experience. It automatically handles zombie processes and cache corruption:

   ```bash
   chmod +x run.sh
   
   # Start everything in Turbo Mode (Cloud-first, handles local cleanup)
   ./run.sh turbo --llm openai
   
   # Deep clean and restart if you face corruption issues
   ./run.sh turbo --llm openai --force-clean
   
   # Check status of all services
   ./run.sh status
   ```

   **Runner Commands:**
   - `all`: Full local stack.
   - `turbo`: Adaptive stack (Cloud LLM + local DB).
   - `stop`: Graceful shutdown of Docker and local processes.
   - `clean`: Deep wipe of volumes and logs.
   - `status`: Health check dashboard.

## Development

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev
```

### Backend
```bash
# Install uv if not present
curl -LsSf https://astral.sh/uv/install.sh | sh

cd backend
# Create venv and sync dependencies
uv sync

# Run server
uv run app/main.py
```

## Testing

The project includes a comprehensive test suite across the stack.

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
pnpm run test:unit    # Unit & Integration
pnpm run test:e2e     # End-to-End with Playwright
```

## Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️.
