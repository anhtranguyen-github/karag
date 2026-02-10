"""
FastAPI Middleware for Request Observability.

Provides:
1. Correlation ID propagation (X-Correlation-ID header)
2. Per-request structured logging with timing
3. Prometheus metrics collection (latency, count, errors)
4. Workspace context binding for downstream tracing

This middleware is the single entry point where observability context
is established for every HTTP request.
"""

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from backend.app.core.telemetry import (
    correlation_id_var,
    workspace_id_var,
    REQUEST_LATENCY,
    REQUEST_COUNT,
    ERROR_COUNT,
)


logger = structlog.get_logger()


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Middleware that:
    1. Generates or inherits a correlation ID per request
    2. Binds workspace_id context from query params or body
    3. Logs request start/end with structured fields
    4. Records Prometheus metrics for the four golden signals
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # --- 1. Correlation ID ---
        # Prefer incoming header (for cross-service tracing), fallback to new UUID
        cid = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())[:12]
        correlation_id_var.set(cid)

        # --- 2. Workspace Context ---
        # Extract workspace_id from query params (most GET endpoints use this)
        wid = request.query_params.get("workspace_id", "")
        workspace_id_var.set(wid)

        # --- 3. Bind structlog context for all downstream log calls ---
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            correlation_id=cid,
            workspace_id=wid,
            method=request.method,
            path=request.url.path,
        )

        # --- 4. Normalize endpoint label for Prometheus (bounded cardinality) ---
        # Replace dynamic path segments with placeholders to avoid label explosion
        endpoint = self._normalize_path(request.url.path)

        start = time.perf_counter()
        status_code = 500  # Default to error; updated on success

        try:
            response = await call_next(request)
            status_code = response.status_code

            # Propagate correlation ID back to caller
            response.headers["X-Correlation-ID"] = cid
            return response

        except Exception as exc:
            ERROR_COUNT.labels(
                method=request.method,
                endpoint=endpoint,
                error_type=type(exc).__name__,
            ).inc()
            raise

        finally:
            duration = time.perf_counter() - start
            status_str = str(status_code)

            # Prometheus metrics
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=endpoint,
                status=status_str,
            ).inc()
            REQUEST_LATENCY.labels(
                method=request.method,
                endpoint=endpoint,
                status=status_str,
            ).observe(duration)

            # Structured log (one line per request, machine-parseable)
            logger.info(
                "http_request",
                status=status_code,
                duration_ms=round(duration * 1000, 2),
            )
            structlog.contextvars.clear_contextvars()

    @staticmethod
    def _normalize_path(path: str) -> str:
        """
        Replace dynamic path segments with placeholders for bounded cardinality.
        
        Examples:
            /chat/history/abc123 → /chat/history/{id}
            /documents/my-paper.pdf → /documents/{name}
            /documents/my-paper.pdf/chunks → /documents/{name}/chunks
        """
        parts = path.strip("/").split("/")
        normalized = []
        # Known static prefixes that precede dynamic segments
        dynamic_after = {"history", "threads", "documents", "tasks"}

        skip_next = False
        for i, part in enumerate(parts):
            if skip_next:
                normalized.append("{id}")
                skip_next = False
                continue
            if part in dynamic_after and i + 1 < len(parts):
                normalized.append(part)
                skip_next = True
            else:
                normalized.append(part)

        return "/" + "/".join(normalized) if normalized else path
