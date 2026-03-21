# Contributing

## Development

1. Install backend dependencies with `uv`:
   ```bash
   cd src/backend
   uv sync --all-groups
   ```
2. Install frontend dependencies with `pnpm`:
   ```bash
   # (Navigate to frontend dir)
   pnpm install
   ```
3. Run tests before opening a PR:
   ```bash
   make test
   ```

## RAG Component Development

RAG is a core foundational pillar of Karag and is located in `src/backend/app/core/rag`.

When adding new RAG components:
- Inherit from `BaseComponent` or its sub-interfaces (`BaseReader`, `BaseChunker`, etc.).
- Register the new class in the corresponding manager (e.g., `ReaderManager`).
- Ensure dependencies are listed in `requirements` and checked in `check_dependencies()`.
- Use `lazy_load()` for heavy model initializations.

## Environment Setup

Ensure the following are configured in your `.env`:
- `LLM_BASE_URL`: The endpoint for your LLM provider (defaults to Omniroute).
- `DEFAULT_LLM_MODEL`: The model name to use for generation and HyDE.

## Quality Checks

- `pre-commit run --all-files`
- `make test`
- `make lint`
