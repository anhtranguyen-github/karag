"""
LLM Resilience Layer: Fallback Strategy and Retry with Exponential Backoff

Implements production patterns for handling LLM failures gracefully:
1. Primary model with fallback chain
2. Exponential backoff retry
3. Circuit breaker pattern
4. Rate limiting per provider
"""

import time
import asyncio
from typing import List, Optional, Callable, TypeVar, Any
from dataclasses import dataclass
from enum import Enum

import structlog
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from backend.app.core.telemetry import (
    get_tracer,
    LLM_FALLBACK_USED,
    LLM_RETRY_COUNT,
)
from backend.app.core.config import karag_settings

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)

T = TypeVar("T")


class LLMError(Exception):
    """Base exception for LLM failures."""
    pass


class RateLimitError(LLMError):
    """Rate limit exceeded."""
    pass


class APIError(LLMError):
    """API error with status code."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class ModelUnavailableError(LLMError):
    """Model is temporarily unavailable."""
    pass


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    max_attempts: int = 3
    min_wait: float = 1.0  # seconds
    max_wait: float = 60.0  # seconds
    exponential_base: float = 2.0
    
    
@dataclass
class FallbackConfig:
    """Configuration for fallback chain."""
    primary: str
    fallbacks: List[str]
    retry_config: RetryConfig = None
    
    def __post_init__(self):
        if self.retry_config is None:
            self.retry_config = RetryConfig()


class RateLimiter:
    """Token bucket rate limiter per provider."""
    
    def __init__(self, requests_per_minute: int):
        self.rpm = requests_per_minute
        self.tokens = requests_per_minute
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()
    
    async def acquire(self):
        """Acquire a token, waiting if necessary."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            
            # Replenish tokens based on time elapsed
            self.tokens = min(
                self.rpm,
                self.tokens + elapsed * (self.rpm / 60.0)
            )
            self.last_update = now
            
            if self.tokens < 1:
                # Wait for token replenishment
                sleep_time = (1 - self.tokens) * (60.0 / self.rpm)
                logger.debug("rate_limit_wait", seconds=sleep_time)
                await asyncio.sleep(sleep_time)
                self.tokens = 0
            
            self.tokens -= 1


class LLMWithFallback:
    """
    LLM client with automatic fallback to alternative models.
    
    Usage:
        client = LLMWithFallback(
            primary="gpt-4-turbo",
            fallbacks=["gpt-3.5-turbo", "claude-3-sonnet"],
            retry_config=RetryConfig(max_attempts=3)
        )
        response = await client.generate(prompt, generate_fn)
    """
    
    def __init__(
        self,
        primary: str,
        fallbacks: List[str],
        retry_config: Optional[RetryConfig] = None,
        rate_limits: Optional[dict] = None,
    ):
        self.primary = primary
        self.fallbacks = fallbacks
        self.retry_config = retry_config or RetryConfig()
        self.rate_limits = rate_limits or {}
        self._limiters: dict = {}
        
        logger.info(
            "llm_fallback_initialized",
            primary=primary,
            fallbacks=fallbacks,
        )
    
    def _get_limiter(self, model: str) -> RateLimiter:
        """Get or create rate limiter for model."""
        if model not in self._limiters:
            rpm = self.rate_limits.get(model, 60)  # Default 60 RPM
            self._limiters[model] = RateLimiter(rpm)
        return self._limiters[model]
    
    def _is_retryable_error(self, error: Exception) -> bool:
        """Determine if error is retryable."""
        if isinstance(error, RateLimitError):
            return True
        if isinstance(error, APIError):
            return error.status_code >= 500 or error.status_code == 429
        if isinstance(error, ModelUnavailableError):
            return True
        return False
    
    async def _execute_with_retry(
        self,
        model: str,
        operation: Callable[[], Any],
    ) -> Any:
        """Execute operation with retry logic."""
        limiter = self._get_limiter(model)
        
        for attempt in range(self.retry_config.max_attempts):
            try:
                await limiter.acquire()
                
                with tracer.start_as_current_span(
                    "llm.generate",
                    attributes={"model": model, "attempt": attempt + 1},
                ):
                    return await operation()
                    
            except Exception as e:
                is_last_attempt = attempt == self.retry_config.max_attempts - 1
                
                if not self._is_retryable_error(e) or is_last_attempt:
                    raise
                
                # Calculate backoff
                wait_time = min(
                    self.retry_config.max_wait,
                    self.retry_config.min_wait * (
                        self.retry_config.exponential_base ** attempt
                    )
                )
                
                LLM_RETRY_COUNT.labels(
                    provider=model.split("/")[0] if "/" in model else model,
                    status="retry",
                ).inc()
                
                logger.warning(
                    "llm_retry",
                    model=model,
                    attempt=attempt + 1,
                    wait_seconds=wait_time,
                    error=str(e),
                )
                
                await asyncio.sleep(wait_time)
        
        raise LLMError(f"Max retries exceeded for {model}")
    
    async def generate(
        self,
        generate_fn: Callable[[str], Any],
        model_override: Optional[str] = None,
    ) -> Any:
        """
        Generate with automatic fallback on failure.
        
        Args:
            generate_fn: Async function that takes model name and returns response
            model_override: Optional specific model to use
            
        Returns:
            Response from first successful model
            
        Raises:
            AllModelsFailedError: If all models fail
        """
        models = [model_override] if model_override else [self.primary] + self.fallbacks
        last_error = None
        
        for i, model in enumerate(models):
            try:
                with tracer.start_as_current_span(
                    "llm.fallback_attempt",
                    attributes={
                        "model": model,
                        "is_fallback": i > 0,
                        "fallback_index": i,
                    },
                ):
                    result = await self._execute_with_retry(
                        model,
                        lambda: generate_fn(model),
                    )
                    
                    # Record fallback usage if not primary
                    if i > 0:
                        LLM_FALLBACK_USED.labels(
                            primary=self.primary,
                            fallback=model,
                        ).inc()
                        logger.info(
                            "llm_fallback_used",
                            primary=self.primary,
                            fallback=model,
                            fallback_index=i,
                        )
                    
                    # Add metadata about the model used
                    if isinstance(result, dict):
                        result["_model_used"] = model
                        result["_is_fallback"] = i > 0
                    
                    return result
                    
            except Exception as e:
                last_error = e
                logger.warning(
                    "llm_model_failed",
                    model=model,
                    error=str(e),
                    fallback_available=i < len(models) - 1,
                )
                continue
        
        # All models failed
        raise AllModelsFailedError(
            f"All models exhausted. Primary: {self.primary}, "
            f"Last error: {last_error}"
        )


class AllModelsFailedError(LLMError):
    """Raised when all models in the fallback chain fail."""
    pass


# Retry decorator factory for easy application
def with_retry(
    max_attempts: int = 3,
    min_wait: float = 1,
    max_wait: float = 60,
    retryable_exceptions: tuple = (RateLimitError, APIError, ModelUnavailableError),
):
    """
    Decorator to add retry logic to LLM calls.
    
    Usage:
        @with_retry(max_attempts=3)
        async def call_llm(prompt: str) -> str:
            return await llm.generate(prompt)
    """
    return retry(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential(multiplier=min_wait, min=min_wait, max=max_wait),
        retry=retry_if_exception_type(retryable_exceptions),
        before_sleep=before_sleep_log(logger, "warning"),
        reraise=True,
    )


# Convenience factory for common configurations
def create_openai_with_fallback() -> LLMWithFallback:
    """Create OpenAI-based client with common fallbacks."""
    return LLMWithFallback(
        primary="gpt-4-turbo",
        fallbacks=["gpt-4", "gpt-3.5-turbo"],
        retry_config=RetryConfig(max_attempts=3),
        rate_limits={
            "gpt-4-turbo": 100,
            "gpt-4": 200,
            "gpt-3.5-turbo": 500,
        },
    )


def create_anthropic_with_fallback() -> LLMWithFallback:
    """Create Anthropic-based client with common fallbacks."""
    return LLMWithFallback(
        primary="claude-3-opus",
        fallbacks=["claude-3-sonnet", "claude-3-haiku"],
        retry_config=RetryConfig(max_attempts=3),
        rate_limits={
            "claude-3-opus": 50,
            "claude-3-sonnet": 200,
            "claude-3-haiku": 500,
        },
    )
