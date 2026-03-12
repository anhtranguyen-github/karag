from __future__ import annotations

import time
import logging
from uuid import uuid4
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import set_log_context, clear_log_context

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Core middleware to log every request and its execution time.
    Sets structured log context (request_id, tenant headers) for the request scope.
    """
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or str(uuid4())
        start_time = time.perf_counter()

        # Set context for all log calls during this request
        set_log_context(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            organization_id=request.headers.get("X-Organization-Id", ""),
            project_id=request.headers.get("X-Project-Id", ""),
            workspace_id=request.headers.get("X-Workspace-Id", ""),
        )

        try:
            response = await call_next(request)

            process_time = time.perf_counter() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            response.headers["X-Request-Id"] = request_id

            logger.info(
                "status=%d duration=%.4fs",
                response.status_code,
                process_time,
            )

            return response
        finally:
            clear_log_context()
