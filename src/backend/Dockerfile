# --- Stage 1: Build ---
FROM python:3.10-slim-bookworm AS builder

# Install uv for extremely fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /workspace/src/backend

# Build argument to toggle CPU/GPU (default to CPU for smaller images)
ARG TARGET_DEVICE=cpu

# Enable uv optimizations
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_CONCURRENT_DOWNLOADS=8

# Install dependencies
# We use a cache mount for uv to speed up subsequent builds
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=src/backend/pyproject.toml,target=pyproject.toml \
    if [ "$TARGET_DEVICE" = "gpu" ] || [ "$TARGET_DEVICE" = "cuda" ]; then \
        uv sync --no-install-project --no-dev --extra local; \
    else \
        uv sync --no-install-project --no-dev; \
    fi

# --- Stage 2: Runtime ---
FROM python:3.10-slim-bookworm

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /workspace

# Copy the virtual environment from the builder stage
COPY --from=builder --chown=appuser:appuser /workspace/src/backend/.venv /workspace/.venv

# Add virtual environment to PATH
ENV PATH="/workspace/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace

# Install runtime system dependencies (minimal) and clean up
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend application code
COPY --chown=appuser:appuser src ./src

# Ensure persistent data and logs directories exist
RUN mkdir -p /workspace/src/backend/data /workspace/logs && \
    chown -R appuser:appuser /workspace/src/backend/data /workspace/logs

USER appuser

EXPOSE 8000

# Healthcheck targets the root endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Production-grade entrypoint
CMD ["uvicorn", "src.backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers"]


