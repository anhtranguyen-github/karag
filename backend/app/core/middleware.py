"""
FastAPI Middleware for Request Observability and Security.

Provides:
1. Correlation ID propagation (X-Correlation-ID header)
2. Per-request structured logging with timing
3. Prometheus metrics collection (latency, count, errors)
4. Workspace context binding for downstream tracing
5. Security headers for all responses

This middleware is the single entry point where observability context
is established for every HTTP request.
"""

from __future__ import annotations

import time
import uuid

import structlog
from backend.app.core.telemetry import (
    ERROR_COUNT,
    REQUEST_COUNT,
    REQUEST_LATENCY,
    correlation_id_var,
    user_id_var,
    workspace_id_var,
)
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.

    Following OWASP and security best practices:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 1; mode=block
    - Strict-Transport-Security (HSTS)
    - Content-Security-Policy
    - Referrer-Policy
    """

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection for legacy browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy (basic)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self';"
        )

        # HSTS - only in production
        # response.headers["Strict-Transport-Security"] = (
        #     "max-age=31536000; includeSubDomains"
        # )

        return response


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Middleware that provides comprehensive request observability.

    Features:
    1. Generates or inherits a correlation ID per request
    2. Binds workspace_id context from query params or body
    3. Logs request start/end with structured fields
    4. Records Prometheus metrics for the four golden signals
    5. Tracks active streams for graceful shutdown

    The correlation ID is propagated:
    - From incoming X-Correlation-ID header (for cross-service tracing)
    - Or generated as a new UUID (for new requests)
    - Returned in response X-Correlation-ID header

    Example log entry:
        {
            "event": "http_request",
            "correlation_id": "abc123",
            "workspace_id": "ws_456",
            "method": "GET",
            "path": "/api/v1/documents",
            "status": 200,
            "duration_ms": 45.23
        }
    """

    # Path segments that are followed by dynamic IDs
    DYNAMIC_PATH_SEGMENTS: frozenset[str] = frozenset(
        {
            "history",
            "threads",
            "documents",
            "tasks",
            "workspaces",
        }
    )

    # Maximum correlation ID length for security
    MAX_CORRELATION_ID_LENGTH: int = 50

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        # --- 1. Correlation ID Management ---
        correlation_id = self._get_correlation_id(request)
        correlation_id_var.set(correlation_id)

        # --- 2. Workspace Context Extraction ---
        workspace_id = self._extract_workspace_id(request)
        workspace_id_var.set(workspace_id)

        # --- 2a. User Context Extraction ---
        user_id = self._extract_user_id(request)
        user_id_var.set(user_id)

        # --- 3. Bind structlog context for all downstream log calls ---
        self._bind_logging_context(request, correlation_id, workspace_id, user_id)

        # --- 4. Normalize endpoint label for Prometheus (bounded cardinality) ---
        endpoint = self._normalize_path(request.url.path)

        # --- 5. Execute request with timing and error tracking ---
        start_time = time.perf_counter()
        status_code = 500  # Default to error; updated on success

        try:
            logger.debug(
                "http_request_started",
                method=request.method,
                path=request.url.path,
                query=str(request.query_params),
                client_ip=request.client.host if request.client else None,
            )

            response = await call_next(request)
            status_code = response.status_code

            # Propagate correlation ID back to caller
            response.headers["X-Correlation-ID"] = correlation_id

            return response

        except Exception as exc:
            status_code = 500
            self._record_error_metrics(request, endpoint, exc)
            raise

        finally:
            self._finalize_request(
                request,
                endpoint,
                status_code,
                start_time,
            )

    def _get_correlation_id(self, request: Request) -> str:
        """
        Extract or generate correlation ID for request tracing.

        Args:
            request: The incoming HTTP request

        Returns:
            Sanitized correlation ID string
        """
        incoming_id = request.headers.get("X-Correlation-ID")

        if incoming_id:
            # Validate and sanitize incoming ID
            if len(incoming_id) <= self.MAX_CORRELATION_ID_LENGTH:
                # Alphanumeric, hyphens, and underscores only
                sanitized = "".join(c for c in incoming_id if c.isalnum() or c in "-_")
                if sanitized:
                    return sanitized

        # Generate new correlation ID
        return str(uuid.uuid4())[:12]

    def _extract_workspace_id(self, request: Request) -> str:
        """
        Extract workspace ID from query params or path.

        Args:
            request: The incoming HTTP request

        Returns:
            Workspace ID or empty string
        """
        # Priority: query param > path param
        workspace_id = request.query_params.get("workspace_id", "")

        if not workspace_id:
            # Try to extract from path: /workspaces/{id}/...
            path_parts = request.url.path.strip("/").split("/")
            if len(path_parts) >= 2 and path_parts[0] == "workspaces":
                workspace_id = path_parts[1] if len(path_parts) > 1 else ""

        return workspace_id

    def _extract_user_id(self, request: Request) -> str:
        """
        Extract user ID from request headers or authentication.

        Args:
            request: The incoming HTTP request

        Returns:
            User ID or empty string
        """
        # Try to get from header (set by auth middleware)
        user_id = request.headers.get("X-User-ID", "")

        if not user_id:
            # Try to get from the "Authorization" header if JWT contains user ID
            # This is a fallback - ideally auth middleware sets X-User-ID
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                # Could decode JWT here if needed, but auth middleware should handle it
                pass

        return user_id

    def _bind_logging_context(
        self,
        request: Request,
        correlation_id: str,
        workspace_id: str,
        user_id: str = "",
    ) -> None:
        """
        Bind structured logging context for the request.

        Args:
            request: The incoming HTTP request
            correlation_id: Request correlation ID
            workspace_id: Workspace ID
            user_id: User ID (from auth)
        """
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            correlation_id=correlation_id,
            workspace_id=workspace_id,
            user_id=user_id,
            method=request.method,
            path=request.url.path,
        )

    @classmethod
    def _normalize_path(cls, path: str) -> str:
        """
        Replace dynamic path segments with placeholders for bounded cardinality.

        This prevents Prometheus label explosion from IDs in URLs like:
        - /chat/history/abc123
        - /documents/my-file.pdf

        Args:
            path: The URL path to normalize

        Returns:
            Normalized path with placeholders

        Examples:
            >>> _normalize_path("/chat/history/abc123")
            "/chat/history/{id}"
            >>> _normalize_path("/documents/my-paper.pdf/chunks")
            "/documents/{id}/chunks"
        """
        parts = path.strip("/").split("/")
        normalized: list[str] = []
        skip_next = False

        for i, part in enumerate(parts):
            if skip_next:
                normalized.append("{id}")
                skip_next = False
                continue

            if part in cls.DYNAMIC_PATH_SEGMENTS and i + 1 < len(parts):
                normalized.append(part)
                skip_next = True
            else:
                normalized.append(part)

        return "/" + "/".join(normalized) if normalized else path

    def _record_error_metrics(
        self,
        request: Request,
        endpoint: str,
        exc: Exception,
    ) -> None:
        """
        Record error metrics in Prometheus.

        Args:
            request: The HTTP request
            endpoint: Normalized endpoint path
            exc: The exception that occurred
        """
        ERROR_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            error_type=type(exc).__name__,
        ).inc()

    def _finalize_request(
        self,
        request: Request,
        endpoint: str,
        status_code: int,
        start_time: float,
    ) -> None:
        """
        Finalize request processing and record metrics.

        Args:
            request: The HTTP request
            endpoint: Normalized endpoint path
            status_code: HTTP status code
            start_time: Request start time (from time.perf_counter)
        """
        duration = time.perf_counter() - start_time
        status_str = str(status_code)

        # Prometheus metrics - four golden signals
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

        # Structured log entry
        log_data = {
            "status": status_code,
            "duration_ms": round(duration * 1000, 2),
            "endpoint": endpoint,
        }

        # Log at appropriate level based on status
        if status_code >= 500:
            logger.error("http_request_error", **log_data)
        elif status_code >= 400:
            logger.warning("http_request_warning", **log_data)
        else:
            logger.info("http_request_complete", **log_data)

        # Clear context for next request
        structlog.contextvars.clear_contextvars()


class RequestTimingMiddleware(BaseHTTPMiddleware):
    """
    Additional middleware for detailed request timing breakdown.

    Can be used for profiling specific endpoints or adding
    custom timing headers to responses.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start

        # Add timing header for debugging (consider removing in production)
        response.headers["X-Response-Time"] = f"{duration:.3f}s"

        return response


def setup_middleware(
    app,
    enable_security_headers: bool = True,
    enable_observability: bool = True,
    enable_timing: bool = False,
) -> None:
    """
    Convenience function to set up all middleware.

    Args:
        app: FastAPI application
        enable_security_headers: Whether to add security headers
        enable_observability: Whether to enable observability middleware
        enable_timing: Whether to add timing headers (debug only)
    """
    if enable_security_headers:
        app.add_middleware(SecurityHeadersMiddleware)

    if enable_observability:
        app.add_middleware(ObservabilityMiddleware)

    if enable_timing:
        app.add_middleware(RequestTimingMiddleware)
