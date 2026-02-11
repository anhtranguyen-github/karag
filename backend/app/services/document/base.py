import structlog
from backend.app.core.telemetry import get_tracer

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)
