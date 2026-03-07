"""
Centralized Observability Module for ScienChan Backend.

Provides three pillars:
1. Structured Logging (structlog) — JSON logs with correlation IDs
2. Distributed Tracing (OpenTelemetry) — Span-based request/pipeline tracing
3. Prometheus Metrics — Four golden signals (latency, traffic, errors, saturation)

All features are configurable via environment variables defined in config.py.
When OTEL_ENABLED=false, tracing degrades to a no-op with zero overhead.
"""

import functools
import logging
import time
from collections.abc import Callable
from contextvars import ContextVar
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any

import structlog
from backend.app.core.config import karag_settings
from opentelemetry import trace
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased
from opentelemetry.trace import StatusCode
from prometheus_client import Counter, Gauge, Histogram

# ---------------------------------------------------------------------------
# Context Variables — thread-safe correlation across async tasks
# ---------------------------------------------------------------------------
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")
workspace_id_var: ContextVar[str] = ContextVar("workspace_id", default="")

# Domain-specific context variables
user_id_var: ContextVar[str] = ContextVar("user_id", default="")
session_id_var: ContextVar[str] = ContextVar("session_id", default="")
domain_action_var: ContextVar[str] = ContextVar("domain_action", default="")


# ---------------------------------------------------------------------------
# Prometheus Metrics — bounded cardinality labels only
# ---------------------------------------------------------------------------
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint", "status"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
)

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests received",
    ["method", "endpoint", "status"],
)

ERROR_COUNT = Counter(
    "http_errors_total",
    "Total HTTP errors",
    ["method", "endpoint", "error_type"],
)

# RAG-specific metrics
RAG_RETRIEVAL_LATENCY = Histogram(
    "rag_retrieval_duration_seconds",
    "RAG retrieval latency in seconds",
    ["engine", "mode"],
    buckets=[0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
)

RAG_CHUNKS_RETRIEVED = Histogram(
    "rag_chunks_retrieved",
    "Number of chunks retrieved per query",
    ["engine"],
    buckets=[0, 1, 3, 5, 10, 15, 20],
)

DOCUMENT_INGESTION_LATENCY = Histogram(
    "document_ingestion_duration_seconds",
    "Document ingestion pipeline latency in seconds",
    ["extension", "stage"],
    buckets=[0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
)

DOCUMENT_INGESTION_COUNT = Counter(
    "document_ingestions_total",
    "Total document ingestions",
    ["extension", "status"],
)

LLM_REQUEST_LATENCY = Histogram(
    "llm_request_duration_seconds",
    "LLM provider request latency in seconds",
    ["provider", "operation"],
    buckets=[0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
)

LLM_REQUEST_COUNT = Counter(
    "llm_requests_total",
    "Total LLM provider requests",
    ["provider", "operation", "status"],
)

EMBEDDING_REQUEST_LATENCY = Histogram(
    "embedding_request_duration_seconds",
    "Embedding provider request latency in seconds",
    ["provider"],
    buckets=[0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
)

VECTOR_STORE_LATENCY = Histogram(
    "vector_store_operation_duration_seconds",
    "Vector store (Qdrant) operation latency in seconds",
    ["operation", "collection"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
)

ACTIVE_STREAMS = Gauge(
    "active_chat_streams",
    "Number of currently active SSE chat streams",
)

LLM_TOKEN_USAGE = Counter(
    "llm_tokens_total",
    "Total LLM tokens consumed",
    ["provider", "model", "token_type"],  # token_type = prompt or completion
)

# Cache metrics
LLM_CACHE_HIT = Counter(
    "llm_cache_hits_total",
    "Total LLM cache hits",
)

LLM_CACHE_MISS = Counter(
    "llm_cache_misses_total",
    "Total LLM cache misses",
)

# Fallback metrics
LLM_FALLBACK_USED = Counter(
    "llm_fallback_used_total",
    "Total fallback model invocations",
    ["primary", "fallback"],
)

LLM_RETRY_COUNT = Counter(
    "llm_retries_total",
    "Total LLM request retries",
    ["provider", "status"],
)

# ---------------------------------------------------------------------------
# Domain-specific metrics — Session, Review, Lesson, Deck operations
# ---------------------------------------------------------------------------

# Session metrics
SESSION_DURATION = Histogram(
    "session_duration_seconds",
    "Duration of review/lesson sessions in seconds",
    ["session_type"],  # session_type = review | lesson
    buckets=[1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
)

SESSION_COUNT = Counter(
    "session_total",
    "Total sessions started or completed",
    ["session_type", "status"],  # status = started | completed | abandoned
)

# FSRS rating metrics
FSRS_REVIEW_COUNT = Counter(
    "fsrs_review_total",
    "Total reviews submitted per FSRS rating",
    ["rating"],  # rating = again | hard | good | easy
)

FSRS_REVIEW_LATENCY = Histogram(
    "fsrs_review_duration_seconds",
    "Time to process a review submission in seconds",
    ["rating"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
)

# Deck metrics
DECK_COUNT = Counter(
    "deck_total",
    "Total deck operations",
    ["operation", "status"],  # operation = created | updated | deleted
)

# Card metrics
CARD_COUNT = Counter(
    "card_total",
    "Total card operations",
    ["operation", "status"],  # operation = created | updated | scheduled | lapsed
)

# Orphan prevention - cards without scheduled state (should be zero)
ORPHAN_CARDS = Gauge(
    "orphan_cards_total",
    "Number of cards without a valid scheduled state (orphan detection)",
)

# Domain error types
DOMAIN_ERROR_COUNT = Counter(
    "domain_errors_total",
    "Total domain operation errors",
    [
        "error_type",
        "domain",
    ],  # error_type = ValueError | RuntimeError | etc., domain = review | lesson | deck
)


def record_llm_usage(
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    workspace_id: str | None = None,
) -> None:
    """Record LLM token usage to both OpenTelemetry and Prometheus."""
    span = trace.get_current_span()
    if span.is_recording():
        span.set_attribute("llm.provider", provider)
        span.set_attribute("llm.model", model)
        span.set_attribute("llm.usage.prompt_tokens", prompt_tokens)
        span.set_attribute("llm.usage.completion_tokens", completion_tokens)
        span.set_attribute("llm.usage.total_tokens", prompt_tokens + completion_tokens)
        if workspace_id:
            span.set_attribute("workspace_id", workspace_id)

    # Prometheus metrics
    LLM_TOKEN_USAGE.labels(provider=provider, model=model, token_type="prompt").inc(prompt_tokens)  # nosec B106
    LLM_TOKEN_USAGE.labels(provider=provider, model=model, token_type="completion").inc(completion_tokens)  # nosec B106


def configure_logging(log_format: str = "json", log_level: str = "INFO") -> None:
    """
    Configure structlog for the entire application.

    - 'json' format: Machine-readable, ideal for production log aggregation.
    - 'console' format: Human-readable colored output for local development.

    Structlog wraps stdlib logging so existing `logging.getLogger()` calls
    continue to work, but new code should use `structlog.get_logger()`.
    """
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if log_format == "console":
        renderer = structlog.dev.ConsoleRenderer()
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=shared_processors + [renderer],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, log_level.upper(), logging.INFO)),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Also configure stdlib logging to use structlog formatting
    # so existing `logging.getLogger()` calls get structured output
    handlers = [logging.StreamHandler()]

    if karag_settings.LOG_FILE:
        log_path = Path(karag_settings.LOG_FILE)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(
            RotatingFileHandler(
                karag_settings.LOG_FILE,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5,
            )
        )

    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, log_level.upper(), logging.INFO),
        handlers=handlers,
    )


def configure_tracing(
    service_name: str,
    endpoint: str,
    sample_rate: float = 1.0,
    enabled: bool = True,
) -> None:
    """
    Configure OpenTelemetry distributed tracing.

    When `enabled=False`, the global tracer provider remains the default no-op,
    meaning all `tracer.start_as_current_span()` calls become zero-cost no-ops.
    This lets us instrument code unconditionally without feature-flag checks.
    """
    if not enabled:
        return

    resource = Resource.create({SERVICE_NAME: service_name})
    sampler = TraceIdRatioBased(sample_rate)
    provider = TracerProvider(resource=resource, sampler=sampler)

    try:
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )

        exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))
    except Exception:
        # If OTLP endpoint is unreachable, log and continue with no-op export.
        # Tracing should never crash the application.
        logger = structlog.get_logger()
        logger.warning(
            "otel_exporter_init_failed",
            endpoint=endpoint,
            msg="Tracing will record spans but cannot export. Check OTLP endpoint.",
        )

    trace.set_tracer_provider(provider)


def get_tracer(name: str = __name__) -> trace.Tracer:
    """Get a tracer instance. Safe to call whether OTEL is enabled or not."""
    return trace.get_tracer(name)


def init_telemetry() -> None:
    """
    Single entry point to initialize all observability subsystems.
    Called once during FastAPI lifespan startup.
    """
    configure_logging(
        log_format=karag_settings.LOG_FORMAT,
        log_level=karag_settings.LOG_LEVEL,
    )
    configure_tracing(
        service_name=karag_settings.OTEL_SERVICE_NAME,
        endpoint=karag_settings.OTEL_EXPORTER_ENDPOINT,
        sample_rate=karag_settings.OTEL_SAMPLE_RATE,
        enabled=karag_settings.OTEL_ENABLED,
    )

    logger = structlog.get_logger()
    logger.info(
        "telemetry_initialized",
        otel_enabled=karag_settings.OTEL_ENABLED,
        metrics_enabled=karag_settings.METRICS_ENABLED,
        log_format=karag_settings.LOG_FORMAT,
        log_level=karag_settings.LOG_LEVEL,
        sample_rate=karag_settings.OTEL_SAMPLE_RATE,
    )


# ---------------------------------------------------------------------------
# Decorator: @traced — adds an OTEL span + timing to any async function
# ---------------------------------------------------------------------------

# Domain operation span names
DOMAIN_SPAN_REVIEW_START = "review.start"
DOMAIN_SPAN_REVIEW_SUBMIT = "review.submit"
DOMAIN_SPAN_LESSON_COMPLETE = "lesson.complete"
DOMAIN_SPAN_DECK_CREATE = "deck.create"


def traced(
    span_name: str | None = None,
    attributes: dict | None = None,
) -> Callable:
    """
    Decorator that wraps an async function in an OpenTelemetry span.

    Usage:
        @traced("rag.search", attributes={"rag.engine": "hybrid"})
        async def search(query: str, workspace_id: str): ...

    The span automatically captures:
    - Duration
    - workspace_id from ContextVar (if set)
    - correlation_id from ContextVar (if set)
    - Error status + exception details on failure
    """

    def decorator(func: Callable) -> Callable:
        name = span_name or f"{func.__module__}.{func.__qualname__}"
        tracer = get_tracer(func.__module__)

        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            span_attrs = dict(attributes or {})
            # Inject context vars as span attributes for cross-reference
            cid = correlation_id_var.get("")
            wid = workspace_id_var.get("")
            if cid:
                span_attrs["correlation_id"] = cid
            if wid:
                span_attrs["workspace_id"] = wid

            with tracer.start_as_current_span(name, attributes=span_attrs) as span:
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as exc:
                    span.set_status(StatusCode.ERROR, str(exc))
                    span.record_exception(exc)
                    raise

        return wrapper

    return decorator


# ---------------------------------------------------------------------------
# Domain-specific logging helpers
# ---------------------------------------------------------------------------


def get_domain_logger(name: str = "domain"):
    """
    Get a logger configured for domain operations with structured context.

    The logger automatically includes:
    - correlation_id
    - user_id
    - session_id
    - workspace_id
    - domain_action

    Usage:
        logger = get_domain_logger()
        logger.info("review_started", domain_action="review.start", session_id=session_id)
    """
    logger = structlog.get_logger(name)

    # Bind common context variables
    bound = logger.bind(
        correlation_id=correlation_id_var.get(""),
        user_id=user_id_var.get(""),
        session_id=session_id_var.get(""),
        workspace_id=workspace_id_var.get(""),
    )
    return bound


def set_domain_context(
    user_id: str | None = None,
    session_id: str | None = None,
    domain_action: str | None = None,
    **kwargs,
) -> None:
    """
    Set domain context variables for the current async context.

    This should be called at the start of domain operations to establish
    the tracing context that propagates through all downstream calls.

    Args:
        user_id: The user performing the action
        session_id: The session ID (for review/lesson sessions)
        domain_action: The domain action (e.g., "review.start", "lesson.complete")
        **kwargs: Additional context to bind
    """
    if user_id:
        user_id_var.set(user_id)
    if session_id:
        session_id_var.set(session_id)
    if domain_action:
        domain_action_var.set(domain_action)

    # Also bind to structlog context for structured logging
    structlog.contextvars.bind_contextvars(
        user_id=user_id or "",
        session_id=session_id or "",
        domain_action=domain_action or "",
        **kwargs,
    )


def log_domain_event(
    event: str,
    level: str = "info",
    **kwargs,
) -> None:
    """
    Log a domain event with structured context.

    Log levels:
    - DEBUG: Flow details (entering/exiting functions)
    - INFO: Decisions and normal operations
    - ERROR: Failures and exceptions

    Args:
        event: The event name (e.g., "review_started", "card_scheduled")
        level: Log level (debug, info, warning, error)
        **kwargs: Additional fields to log
    """
    logger = get_domain_logger()

    log_data = {
        "event": event,
        "correlation_id": correlation_id_var.get(""),
        "user_id": user_id_var.get(""),
        "session_id": session_id_var.get(""),
        "workspace_id": workspace_id_var.get(""),
        "domain_action": domain_action_var.get(""),
        **kwargs,
    }

    log_func = getattr(logger, level.lower(), logger.info)
    log_func(**log_data)


def record_domain_metrics(
    session_type: str | None = None,
    rating: str | None = None,
    operation: str | None = None,
    error_type: str | None = None,
    domain: str | None = None,
    duration: float | None = None,
) -> None:
    """
    Record domain-specific metrics.

    This function automatically selects the appropriate metric based on
    the provided parameters.

    Args:
        session_type: "review" or "lesson" (for session metrics)
        rating: FSRS rating - "again", "hard", "good", or "easy"
        operation: Deck/card operation - "created", "updated", "deleted", etc.
        error_type: Domain error type for error counting
        domain: Domain for error tracking - "review", "lesson", "deck"
        duration: Duration in seconds (for latency metrics)
    """
    # Session duration
    if session_type and duration is not None:
        SESSION_DURATION.labels(session_type=session_type).observe(duration)

    # FSRS rating metrics
    if rating:
        FSRS_REVIEW_COUNT.labels(rating=rating).inc()
        if duration is not None:
            FSRS_REVIEW_LATENCY.labels(rating=rating).observe(duration)

    # Deck/card operations
    if operation:
        if domain == "deck":
            DECK_COUNT.labels(operation=operation, status="success").inc()
        else:
            CARD_COUNT.labels(operation=operation, status="success").inc()

    # Domain errors
    if error_type and domain:
        DOMAIN_ERROR_COUNT.labels(error_type=error_type, domain=domain).inc()


# ---------------------------------------------------------------------------
# Convenience decorators for domain operations
# ---------------------------------------------------------------------------


def traced_domain(
    span_name: str,
    domain_action: str | None = None,
    attributes: dict | None = None,
) -> Callable:
    """
    Decorator for domain operations that adds tracing, logging, and metrics.

    This is a higher-level decorator that combines:
    - @traced for OpenTelemetry spans
    - Automatic logging at appropriate levels
    - Metrics recording

    Usage:
        @traced_domain("review.submit", domain_action="review.submit")
        async def submit_review(review_data: ReviewData):
            ...

    Args:
        span_name: The OpenTelemetry span name
        domain_action: The domain action for logging context
        attributes: Additional span attributes
    """

    def decorator(func: Callable) -> Callable:
        # Apply the base traced decorator
        traced_func = traced(span_name, attributes)

        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Set domain context
            if domain_action:
                set_domain_context(domain_action=domain_action)

            # Log start
            log_domain_event(f"{domain_action or span_name}.started", level="debug")

            start_time = time.perf_counter()

            try:
                result = await traced_func(func)(*args, **kwargs)
                duration = time.perf_counter() - start_time

                # Log success
                log_domain_event(
                    f"{domain_action or span_name}.completed",
                    level="info",
                    duration_ms=round(duration * 1000, 2),
                )

                # Record metrics
                if domain_action == DOMAIN_SPAN_REVIEW_SUBMIT and len(args) > 0:
                    # Try to extract rating from args if available
                    pass  # Rating-specific metrics handled in the function

                return result

            except Exception as exc:
                duration = time.perf_counter() - start_time

                # Log error
                log_domain_event(
                    f"{domain_action or span_name}.failed",
                    level="error",
                    error=str(exc),
                    error_type=type(exc).__name__,
                    duration_ms=round(duration * 1000, 2),
                )

                # Record error metric
                if domain_action and domain_action.startswith("review."):
                    DOMAIN_ERROR_COUNT.labels(
                        error_type=type(exc).__name__,
                        domain="review",
                    ).inc()
                elif domain_action and domain_action.startswith("lesson."):
                    DOMAIN_ERROR_COUNT.labels(
                        error_type=type(exc).__name__,
                        domain="lesson",
                    ).inc()
                elif domain_action and domain_action.startswith("deck."):
                    DOMAIN_ERROR_COUNT.labels(
                        error_type=type(exc).__name__,
                        domain="deck",
                    ).inc()

                raise

        return wrapper

    return decorator
