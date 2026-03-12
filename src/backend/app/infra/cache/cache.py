"""In-memory and Redis implementations of the CachePort."""
from __future__ import annotations

import json
import logging
import time
from typing import Any

from app.core.ports.cache import CachePort

logger = logging.getLogger(__name__)


class InMemoryCache:
    """Simple TTL-aware in-memory cache for development and testing."""

    def __init__(self) -> None:
        self.name = "in-memory"
        self._store: dict[str, tuple[Any, float | None]] = {}

    async def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if expires_at is not None and time.monotonic() > expires_at:
            del self._store[key]
            return None
        return value

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        expires_at = (time.monotonic() + ttl_seconds) if ttl_seconds else None
        self._store[key] = (value, expires_at)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def exists(self, key: str) -> bool:
        return await self.get(key) is not None


class RedisCache:
    """Redis-backed cache for production."""

    def __init__(self, redis_url: str) -> None:
        self.name = "redis"
        self._redis = None
        try:
            from redis.asyncio import Redis
            self._redis = Redis.from_url(redis_url, decode_responses=True)
        except Exception:
            logger.warning("RedisCache: failed to connect, get/set will no-op")

    async def get(self, key: str) -> Any | None:
        if not self._redis:
            return None
        raw = await self._redis.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        if not self._redis:
            return
        serialized = json.dumps(value) if not isinstance(value, str) else value
        if ttl_seconds:
            await self._redis.setex(key, ttl_seconds, serialized)
        else:
            await self._redis.set(key, serialized)

    async def delete(self, key: str) -> None:
        if not self._redis:
            return
        await self._redis.delete(key)

    async def exists(self, key: str) -> bool:
        if not self._redis:
            return False
        return bool(await self._redis.exists(key))
