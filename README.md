# Karag

Karag is a monorepo AI platform with a FastAPI backend, Next.js frontend, shared SDK generation, root-level tests, and a standardized local DevOps workflow.

## Repository layout

- `src/backend`: backend application
- `src/frontend`: frontend application
- `tests`: unit, integration, e2e, fixtures, and mocks
- `docker`: Dockerfiles and compose assets
- `scripts`: standard developer entrypoints
- `observability`: logging, metrics, and tracing conventions
- `docs`: architecture and developer workflow documentation

## Local development

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build` or `./scripts/dev.sh`.
3. Open the frontend on `http://localhost:3000`.
4. Open the backend on `http://localhost:8000`.

## Standard commands

```bash
./scripts/dev.sh
./scripts/lint.sh
./scripts/test.sh
./scripts/build.sh
```

## Backend

```bash
cd src/backend
uv sync
uv run uvicorn src.backend.app.main:app --reload
```

## Frontend

```bash
cd src/frontend
pnpm install
pnpm run generate:api
pnpm run dev
```

## CI/CD

GitHub Actions workflows:

- `.github/workflows/ci.yml`
- `.github/workflows/test.yml`
- `.github/workflows/release.yml`

## Documentation

- [Architecture](docs/architecture.md)
- [Development Setup](docs/dev-setup.md)
- [Testing](docs/testing.md)
- [DevOps](docs/devops.md)
