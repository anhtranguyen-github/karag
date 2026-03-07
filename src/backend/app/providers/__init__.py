"""Provider-agnostic LLM abstraction layer.

This module provides a clean interface between the application and LLM providers,
isolating LangChain dependencies and preventing vendor lock-in.

Usage:
    >>> from src.backend.app.providers import get_llm, LLMProvider, LLMMessage
    >>> llm = await get_llm()
    >>> response = await llm.chat([LLMMessage(role="user", content="Hello!")])
    >>> print(response.content)

Capability-based features:
    >>> from src.backend.app.providers import ToolCapable
    >>> if isinstance(llm, ToolCapable):
    ...     result = await llm.chat_with_tools(messages, tools)
"""

from src.backend.app.providers.base import (
    LangGraphCompatible,
    LLMMessage,
    LLMProvider,
    LLMResponse,
    StructuredOutputCapable,
    ToolCapable,
)
from src.backend.app.providers.embedding import EmbeddingProvider
from src.backend.app.providers.llm import get_llm

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

