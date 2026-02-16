# --- Stage 1: Build & Sync ---
FROM python:3.10-slim AS builder

# Install uv for extremely fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Install dependencies to a virtual environment
# Using frozen lockfile ensures reproducible production builds
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=backend/uv.lock,target=uv.lock \
    --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev

# --- Stage 2: Runtime ---
FROM python:3.10-slim-bullseye

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy the virtual environment from the builder stage
COPY --from=builder /app/.venv /app/.venv

# Add virtual environment to PATH
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install runtime system dependencies (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend application code with correct ownership
COPY --chown=appuser:appuser backend/app ./backend/app

# Ensure persistent data directory exists with correct permissions
RUN mkdir -p /app/backend/data && chown -R appuser:appuser /app/backend/data

# Switch to non-root user
USER appuser

# Metadata
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Production-grade entrypoint
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers"]
