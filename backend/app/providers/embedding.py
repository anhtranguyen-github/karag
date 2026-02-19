
import structlog
from backend.app.core.telemetry import (
    get_tracer,
)
from typing import Optional

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


async def get_embeddings(workspace_id: Optional[str] = None):
    """Factory proxy to get the configured Embedding provider for a specific workspace."""
    from backend.app.core.factory import LangChainFactory
    
    return await LangChainFactory.get_embeddings(workspace_id)
