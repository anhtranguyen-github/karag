"""
LLM Response Caching Layer

Implements deterministic caching for LLM calls to reduce costs and latency.
Only caches when temperature=0 for reproducible outputs.
"""

import hashlib
import json
from typing import Optional
from datetime import datetime, timedelta

import structlog
from backend.app.core.config import karag_settings
from backend.app.core.telemetry import get_tracer, LLM_CACHE_HIT, LLM_CACHE_MISS

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class LLMCache:
    """
    Cache for LLM responses with TTL support.

    Design decisions:
    - Only cache deterministic outputs (temperature=0)
    - Use SHA256 for cache key generation
    - Support Redis or in-memory fallback
    """

    def __init__(self, ttl_seconds: int = 3600):
        self.ttl = ttl_seconds
        self._memory_cache: dict = {}
        self._redis = None

        # Try to use Redis if available
        try:
            import redis.asyncio as redis

            if hasattr(karag_settings, "REDIS_URL"):
                self._redis = redis.from_url(karag_settings.REDIS_URL)
                logger.info("llm_cache_redis_initialized")
        except Exception as e:
            logger.warning("llm_cache_memory_fallback", error=str(e))

    def _cache_key(self, prompt: str, model: str, provider: str, **kwargs) -> str:
        """Generate deterministic cache key from request parameters."""
        # Only include deterministic parameters in key
        cache_params = {
            "model": model,
            "provider": provider,
            "prompt": prompt,
            "max_tokens": kwargs.get("max_tokens"),
            "top_p": kwargs.get("top_p"),
            # Intentionally exclude temperature (handled separately)
        }
        content = json.dumps(cache_params, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()

    async def get(self, key: str) -> Optional[dict]:
        """Retrieve cached response if available and not expired."""
        with tracer.start_as_current_span("llm_cache.get"):
            if self._redis:
                try:
                    data = await self._redis.get(f"llm:{key}")
                    if data:
                        LLM_CACHE_HIT.inc()
                        return json.loads(data)
                except Exception as e:
                    logger.warning("llm_cache_redis_error", error=str(e))

            # Fallback to memory cache
            if key in self._memory_cache:
                entry = self._memory_cache[key]
                if datetime.utcnow() < entry["expires_at"]:
                    LLM_CACHE_HIT.inc()
                    return entry["data"]
                else:
                    del self._memory_cache[key]

            LLM_CACHE_MISS.inc()
            return None

    async def set(self, key: str, response: dict, temperature: float = 1.0) -> None:
        """Cache response only if deterministic (temperature=0)."""
        # Only cache deterministic outputs
        if temperature != 0:
            return

        with tracer.start_as_current_span("llm_cache.set"):
            cache_entry = {
                "response": response,
                "cached_at": datetime.utcnow().isoformat(),
            }

            if self._redis:
                try:
                    await self._redis.setex(
                        f"llm:{key}", self.ttl, json.dumps(cache_entry)
                    )
                    return
                except Exception as e:
                    logger.warning("llm_cache_redis_set_error", error=str(e))

            # Fallback to memory cache
            self._memory_cache[key] = {
                "data": cache_entry,
                "expires_at": datetime.utcnow() + timedelta(seconds=self.ttl),
            }

    async def get_or_generate(
        self,
        prompt: str,
        model: str,
        provider: str,
        generate_fn: callable,
        temperature: float = 1.0,
        **kwargs,
    ) -> dict:
        """
        Get from cache or generate new response.

        Args:
            prompt: The input prompt
            model: Model identifier
            provider: Provider name
            generate_fn: Async function to call if cache miss
            temperature: Sampling temperature (only cache if 0)
            **kwargs: Additional parameters

        Returns:
            Response dict with optional "_cached" flag
        """
        # Skip cache for non-deterministic requests
        if temperature != 0:
            response = await generate_fn()
            response["_cached"] = False
            return response

        key = self._cache_key(prompt, model, provider, **kwargs)

        # Try cache
        cached = await self.get(key)
        if cached:
            cached["response"]["_cached"] = True
            logger.debug("llm_cache_hit", key=key[:16])
            return cached["response"]

        # Generate and cache
        response = await generate_fn()
        response["_cached"] = False
        await self.set(key, response, temperature)

        logger.debug("llm_cache_miss", key=key[:16])
        return response

    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern."""
        count = 0

        if self._redis:
            try:
                # Use Redis SCAN to find matching keys
                async for key in self._redis.scan_iter(match=f"llm:*{pattern}*"):
                    await self._redis.delete(key)
                    count += 1
            except Exception as e:
                logger.error("llm_cache_invalidate_error", error=str(e))
        else:
            # Memory cache - simple pattern matching
            keys_to_delete = [k for k in self._memory_cache.keys() if pattern in k]
            for k in keys_to_delete:
                del self._memory_cache[k]
            count = len(keys_to_delete)

        logger.info("llm_cache_invalidated", pattern=pattern, count=count)
        return count


# Global cache instance
llm_cache = LLMCache()
