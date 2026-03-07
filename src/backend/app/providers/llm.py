"""Provider entry point for LLM access.

This module provides the main entry point for obtaining an LLM provider
instance. It delegates to the ProviderFactory and returns the provider-agnostic
LLMProvider interface.
"""

import structlog
from src.backend.app.core.telemetry import get_tracer
from src.backend.app.providers.base import LLMProvider

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


async def get_llm(workspace_id: str | None = None) -> LLMProvider:
    """Get the configured LLM provider for a specific workspace.

    This is the primary entry point for obtaining an LLM provider.
    It returns a provider-agnostic LLMProvider interface that can be
    used throughout the application.

    Args:
        workspace_id: Optional workspace identifier for workspace-specific settings

    Returns:
        LLMProvider: Configured provider implementing the LLMProvider interface

    Example:
        >>> llm = await get_llm(workspace_id="workspace-123")
        >>> response = await llm.chat([
        ...     LLMMessage(role="user", content="Hello!")
        ... ])
        >>> print(response.content)
    """
    from src.backend.app.core.factory import ProviderFactory

    return await ProviderFactory.get_llm(workspace_id)

