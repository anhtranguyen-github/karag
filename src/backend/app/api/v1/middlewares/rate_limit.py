from __future__ import annotations

import time
from typing import Callable

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
import redis


class RedisRateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        redis_url: str,
        limit: int = 100,
        window: int = 60,
    ) -> None:
        super().__init__(app)
        self.redis = redis.from_url(redis_url)
        self.limit = limit
        self.window = window

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Simple client-based rate limiting (by IP)
        ident = request.client.host if request.client else "unknown"
        key = f"rate_limit:{ident}"
        
        try:
            current = self.redis.get(key)
            if current and int(current) >= self.limit:
                return Response(
                    content="Rate limit exceeded",
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            
            pipeline = self.redis.pipeline()
            pipeline.incr(key)
            pipeline.expire(key, self.window)
            pipeline.execute()
        except Exception:
            # Fallback if redis is down: allow request but maybe log it
            pass

        return await call_next(request)
