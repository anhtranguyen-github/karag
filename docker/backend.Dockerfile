FROM python:3.11-slim-bookworm AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /workspace/src/backend

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=src/backend/pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=src/backend/uv.lock,target=uv.lock \
    uv sync --no-install-project --no-dev

FROM python:3.11-slim-bookworm

RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /workspace

COPY --from=builder --chown=appuser:appuser /workspace/src/backend/.venv /workspace/.venv
COPY --chown=appuser:appuser src ./src
COPY --chown=appuser:appuser openapi ./openapi

ENV PATH="/workspace/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || curl -f http://localhost:8000/ || exit 1

CMD ["uvicorn", "src.backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

