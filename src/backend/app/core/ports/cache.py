from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any

class CachePort(ABC):
    """Port for simple key-value caching logic."""
    
    @abstractmethod
    async def get(self, key: str) -> Any | None: 
        """Retrieve a value by key (returns None if missing/expired)."""
        pass

    @abstractmethod
    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        """Store a value with an optional TTL."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Remove a value from the cache."""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if a key exists and is non-expired."""
        pass
