"""
Centralized Observability Module for ScienChan Backend.

Provides three pillars:
1. Structured Logging (structlog) — JSON logs with correlation IDs
2. Distributed Tracing (OpenTelemetry) — Span-based request/pipeline tracing
3. Prometheus Metrics — Four golden signals (latency, traffic, errors, saturation)

All features are configurable via environment variables defined in config.py.
When OTEL_ENABLED=false, tracing degrades to a no-op with zero overhead.
"""

import logging
import functools
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler
from typing import Optional, Callable, Any
from contextvars import ContextVar

from backend.app.core.config import ai_settings

import structlog
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.trace import StatusCode
from prometheus_client import Counter, Histogram, Gauge

# ---------------------------------------------------------------------------
# Context Variables — thread-safe correlation across async tasks
# ---------------------------------------------------------------------------
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")
workspace_id_var: ContextVar[str] = ContextVar("workspace_id", default="")


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
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Also configure stdlib logging to use structlog formatting
    # so existing `logging.getLogger()` calls get structured output
    handlers = [logging.StreamHandler()]
    
    if ai_settings.LOG_FILE:
        log_path = Path(ai_settings.LOG_FILE)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(
            RotatingFileHandler(
                ai_settings.LOG_FILE,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5
            )
        )

    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, log_level.upper(), logging.INFO),
        handlers=handlers
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
        log_format=ai_settings.LOG_FORMAT,
        log_level=ai_settings.LOG_LEVEL,
    )
    configure_tracing(
        service_name=ai_settings.OTEL_SERVICE_NAME,
        endpoint=ai_settings.OTEL_EXPORTER_ENDPOINT,
        sample_rate=ai_settings.OTEL_SAMPLE_RATE,
        enabled=ai_settings.OTEL_ENABLED,
    )

    logger = structlog.get_logger()
    logger.info(
        "telemetry_initialized",
        otel_enabled=ai_settings.OTEL_ENABLED,
        metrics_enabled=ai_settings.METRICS_ENABLED,
        log_format=ai_settings.LOG_FORMAT,
        log_level=ai_settings.LOG_LEVEL,
        sample_rate=ai_settings.OTEL_SAMPLE_RATE,
    )


# ---------------------------------------------------------------------------
# Decorator: @traced — adds an OTEL span + timing to any async function
# ---------------------------------------------------------------------------
def traced(
    span_name: Optional[str] = None,
    attributes: Optional[dict] = None,
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
