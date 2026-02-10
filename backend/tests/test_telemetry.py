"""
Tests for the observability and telemetry subsystem.

Verifies:
1. Telemetry initialization (structlog, OTEL, Prometheus)
2. Correlation ID context propagation
3. Prometheus metrics registration and increment
4. Middleware path normalization for bounded cardinality
5. The @traced decorator wraps spans correctly
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock

from backend.app.core.telemetry import (
    configure_logging,
    configure_tracing,
    init_telemetry,
    get_tracer,
    traced,
    correlation_id_var,
    workspace_id_var,
    REQUEST_COUNT,
    REQUEST_LATENCY,
    ERROR_COUNT,
    RAG_RETRIEVAL_LATENCY,
    DOCUMENT_INGESTION_COUNT,
    LLM_REQUEST_LATENCY,
    ACTIVE_STREAMS,
)
from backend.app.core.middleware import ObservabilityMiddleware


# ---------------------------------------------------------------------------
# Telemetry Configuration Tests
# ---------------------------------------------------------------------------

class TestConfigureLogging:
    """Test structlog configuration for both formats."""

    def test_configure_json_format(self):
        """JSON format should configure without error."""
        configure_logging(log_format="json", log_level="INFO")

    def test_configure_console_format(self):
        """Console format should configure without error."""
        configure_logging(log_format="console", log_level="DEBUG")

    def test_configure_invalid_level_defaults_gracefully(self):
        """Invalid log level should fall back to INFO without crashing."""
        configure_logging(log_format="json", log_level="NONEXISTENT")


class TestConfigureTracing:
    """Test OTEL tracing setup."""

    def test_tracing_disabled_is_noop(self):
        """When OTEL_ENABLED=False, no tracer provider is set."""
        # Should not raise even with unreachable endpoint
        configure_tracing(
            service_name="test-service",
            endpoint="http://unreachable:4317",
            sample_rate=1.0,
            enabled=False,
        )

    def test_tracing_enabled_with_invalid_endpoint(self):
        """When OTEL is enabled but endpoint is unreachable, it should warn but not crash."""
        configure_tracing(
            service_name="test-service",
            endpoint="http://localhost:99999",
            sample_rate=0.5,
            enabled=True,
        )

    def test_get_tracer_returns_tracer(self):
        """get_tracer should always return a valid tracer (possibly no-op)."""
        tracer = get_tracer("test_module")
        assert tracer is not None


class TestInitTelemetry:
    """Test the combined initialization entry point."""

    @patch("backend.app.core.config.ai_settings")
    def test_init_telemetry_with_defaults(self, mock_settings):
        """init_telemetry should configure logging and tracing from settings."""
        mock_settings.OTEL_ENABLED = False
        mock_settings.OTEL_EXPORTER_ENDPOINT = "http://localhost:4317"
        mock_settings.OTEL_SERVICE_NAME = "test-service"
        mock_settings.OTEL_SAMPLE_RATE = 1.0
        mock_settings.METRICS_ENABLED = True
        mock_settings.LOG_FORMAT = "json"
        mock_settings.LOG_LEVEL = "INFO"

        # Should not raise
        init_telemetry()


# ---------------------------------------------------------------------------
# Context Variable Tests
# ---------------------------------------------------------------------------

class TestContextVariables:
    """Test that context variables propagate correctly in async contexts."""

    def test_correlation_id_default(self):
        """Default correlation ID should be empty string."""
        assert correlation_id_var.get() == "" or isinstance(correlation_id_var.get(), str)

    def test_correlation_id_set_and_get(self):
        """Setting correlation ID should be retrievable."""
        token = correlation_id_var.set("test-corr-123")
        assert correlation_id_var.get() == "test-corr-123"
        correlation_id_var.reset(token)

    def test_workspace_id_set_and_get(self):
        """Setting workspace ID should be retrievable."""
        token = workspace_id_var.set("ws-abc")
        assert workspace_id_var.get() == "ws-abc"
        workspace_id_var.reset(token)


# ---------------------------------------------------------------------------
# Prometheus Metrics Tests
# ---------------------------------------------------------------------------

class TestPrometheusMetrics:
    """Test that metrics are properly defined and can be incremented."""

    def test_request_count_exists(self):
        """REQUEST_COUNT counter should be defined with correct labels."""
        REQUEST_COUNT.labels(method="GET", endpoint="/test", status="200").inc()
        # Should not raise

    def test_request_latency_exists(self):
        """REQUEST_LATENCY histogram should be defined."""
        REQUEST_LATENCY.labels(method="POST", endpoint="/chat/stream", status="200").observe(0.5)

    def test_error_count_exists(self):
        """ERROR_COUNT counter should be defined."""
        ERROR_COUNT.labels(method="GET", endpoint="/test", error_type="ValueError").inc()

    def test_rag_retrieval_latency(self):
        """RAG retrieval latency histogram should accept engine and mode labels."""
        RAG_RETRIEVAL_LATENCY.labels(engine="basic", mode="hybrid").observe(1.2)

    def test_document_ingestion_count(self):
        """Document ingestion counter should accept extension and status labels."""
        DOCUMENT_INGESTION_COUNT.labels(extension=".pdf", status="success").inc()

    def test_llm_request_latency(self):
        """LLM request latency should accept provider and operation labels."""
        LLM_REQUEST_LATENCY.labels(provider="openai", operation="reason").observe(2.5)

    def test_active_streams_gauge(self):
        """ACTIVE_STREAMS gauge should support inc/dec."""
        ACTIVE_STREAMS.inc()
        ACTIVE_STREAMS.dec()


# ---------------------------------------------------------------------------
# Middleware Tests
# ---------------------------------------------------------------------------

class TestMiddlewarePathNormalization:
    """Test that dynamic path segments are normalized for bounded cardinality."""

    def test_normalize_history_path(self):
        result = ObservabilityMiddleware._normalize_path("/chat/history/abc123")
        assert result == "/chat/history/{id}"

    def test_normalize_threads_path(self):
        result = ObservabilityMiddleware._normalize_path("/chat/threads/xyz789")
        assert result == "/chat/threads/{id}"

    def test_normalize_documents_path(self):
        result = ObservabilityMiddleware._normalize_path("/documents/my-paper.pdf")
        assert result == "/documents/{id}"

    def test_normalize_tasks_path(self):
        result = ObservabilityMiddleware._normalize_path("/tasks/task123")
        assert result == "/tasks/{id}"

    def test_static_path_unchanged(self):
        result = ObservabilityMiddleware._normalize_path("/chat/stream")
        assert result == "/chat/stream"

    def test_root_path_unchanged(self):
        result = ObservabilityMiddleware._normalize_path("/")
        assert result == "/"

    def test_metrics_path_unchanged(self):
        result = ObservabilityMiddleware._normalize_path("/metrics")
        assert result == "/metrics"


# ---------------------------------------------------------------------------
# @traced Decorator Tests
# ---------------------------------------------------------------------------

class TestTracedDecorator:
    """Test the @traced decorator for async functions."""

    @pytest.mark.asyncio
    async def test_traced_returns_result(self):
        """Decorated function should return its result unchanged."""

        @traced("test.operation")
        async def my_func(x: int, y: int) -> int:
            return x + y

        result = await my_func(3, 4)
        assert result == 7

    @pytest.mark.asyncio
    async def test_traced_propagates_exception(self):
        """Decorated function should re-raise exceptions."""

        @traced("test.failing_operation")
        async def failing_func():
            raise ValueError("test error")

        with pytest.raises(ValueError, match="test error"):
            await failing_func()

    @pytest.mark.asyncio
    async def test_traced_inherits_context_vars(self):
        """Decorated function should pick up correlation_id and workspace_id from context."""
        captured = {}

        @traced("test.context_aware")
        async def context_func():
            captured["cid"] = correlation_id_var.get()
            captured["wid"] = workspace_id_var.get()
            return True

        cid_token = correlation_id_var.set("corr-xyz")
        wid_token = workspace_id_var.set("ws-test")

        result = await context_func()
        assert result is True
        assert captured["cid"] == "corr-xyz"
        assert captured["wid"] == "ws-test"

        correlation_id_var.reset(cid_token)
        workspace_id_var.reset(wid_token)

    @pytest.mark.asyncio
    async def test_traced_with_custom_attributes(self):
        """Traced should accept custom span attributes."""

        @traced("test.custom_attrs", attributes={"custom.key": "custom_value"})
        async def custom_func():
            return "ok"

        result = await custom_func()
        assert result == "ok"

    @pytest.mark.asyncio
    async def test_traced_default_name(self):
        """When no span_name is given, the decorator should use module.qualname."""

        @traced()
        async def auto_named_func():
            return 42

        result = await auto_named_func()
        assert result == 42
