# Use specific version tag instead of generic 3.10-slim
FROM python:3.10.13-slim-bullseye

# Copy uv from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    UV_SYSTEM_PYTHON=1

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create and set working directory
WORKDIR /app

# Install system dependencies with cleanup
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies using uv
COPY backend/requirements.txt .
RUN uv pip install --no-cache -r requirements.txt

# Copy backend application code
COPY --chown=appuser:appuser backend/app ./backend/app

# Create internal data directory and set permissions
RUN mkdir -p /app/backend/data && chown -R appuser:appuser /app/backend/data

# Switch to non-root user
USER appuser

# Define volume for persistent data (Settings, Tools, Local cache)
VOLUME ["/app/backend/data"]

# Expose the application port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Command to run the application using uvicorn directly for production
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
