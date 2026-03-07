# Monorepo Starter

FastAPI backend + Next.js frontend monorepo starter.

## Stack

- Backend: FastAPI
- Frontend: Next.js
- Python package manager: `uv`
- Node package manager: `pnpm`
- Testing: `pytest`
- CI/CD: GitHub Actions + Jenkins
- Code quality: `pre-commit` + `ruff`

## Structure

```text
src/
  backend/
  frontend/
```

## Quick Start

```bash
make backend-install
make frontend-install
make backend-dev
make frontend-dev
```

## Backend

```bash
cd src/backend
uv sync
uv run pytest
```

## Frontend

```bash
cd src/frontend
pnpm install
pnpm dev
```
