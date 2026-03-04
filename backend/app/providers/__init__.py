"""Provider-agnostic LLM abstraction layer.

This module provides a clean interface between the application and LLM providers,
isolating LangChain dependencies and preventing vendor lock-in.

Usage:
    >>> from backend.app.providers import get_llm, LLMProvider, LLMMessage
    >>> llm = await get_llm()
    >>> response = await llm.chat([LLMMessage(role="user", content="Hello!")])
    >>> print(response.content)

Capability-based features:
    >>> from backend.app.providers import ToolCapable
    >>> if isinstance(llm, ToolCapable):
    ...     result = await llm.chat_with_tools(messages, tools)
"""

from backend.app.providers.base import (
    LLMProvider,
    LLMResponse,
    LLMMessage,
    ToolCapable,
    StructuredOutputCapable,
    LangGraphCompatible,
)
from backend.app.providers.embedding import EmbeddingProvider
from backend.app.providers.llm import get_llm

__all__ = [
    # Core abstractions
    "LLMProvider",
    "LLMResponse",
    "LLMMessage",
    "EmbeddingProvider",
    # Capability protocols
    "ToolCapable",
    "StructuredOutputCapable",
    "LangGraphCompatible",
    # Entry points
    "get_llm",
]
