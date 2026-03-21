"""Cache port — abstraction for key-value caching.

Follows the same graceful-degradation pattern as EventBus:
InMemoryCache as fallback, RedisCache for production.
"""
from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class CachePort(Protocol):
    """Port for key-value cache operations."""
    name: str

    async def get(self, key: str) -> Any | None:
        """Return cached value or None."""
        ...

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        """Store a value with optional TTL."""
        ...

    async def delete(self, key: str) -> None:
        """Remove a key."""
        ...

    async def exists(self, key: str) -> bool:
        """Check if a key exists."""
        ...
