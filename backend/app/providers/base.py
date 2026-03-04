"""Minimal, provider-agnostic LLM abstraction layer.

This module defines the core interfaces and data structures for LLM providers.
All LangChain dependencies are isolated to the adapter module.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, AsyncIterator, Dict, List, Optional, Protocol, runtime_checkable

from pydantic import BaseModel, Field


class LLMResponse(BaseModel):
    """Standardized LLM response across all providers."""
    content: str
    model: str
    provider: str
    usage: Optional[Dict[str, int]] = None
    metadata: Optional[Dict[str, Any]] = None
    finish_reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


@dataclass
class LLMMessage:
    """Provider-agnostic message format.
    
    Supports: system, user, assistant, and tool roles.
    """
    role: str  # "system", "user", "assistant", "tool"
    content: str
    name: Optional[str] = None  # For tool messages
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None


class LLMProvider(ABC):
    """Minimal core interface for LLM providers.
    
    This is the primary abstraction that all LLM providers must implement.
    It provides a clean, stable interface that isolates the application from
    specific provider implementations.
    """
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider identifier (e.g., 'openai', 'azure', 'ollama')."""
        pass
    
    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the model identifier (e.g., 'gpt-4', 'llama2')."""
        pass
    
    @abstractmethod
    async def chat(self, messages: List[LLMMessage], **kwargs) -> LLMResponse:
        """Execute a chat completion request.
        
        Args:
            messages: List of messages in the conversation
            **kwargs: Provider-specific options (temperature, max_tokens, etc.)
            
        Returns:
            Standardized LLMResponse
        """
        pass
    
    @abstractmethod
    async def stream(self, messages: List[LLMMessage], **kwargs) -> AsyncIterator[str]:
        """Execute a streaming chat completion request.
        
        Args:
            messages: List of messages in the conversation
            **kwargs: Provider-specific options
            
        Yields:
            Text chunks as they are generated
        """
        pass


# =============================================================================
# Capability-based Extensions via Protocols
# =============================================================================

@runtime_checkable
class ToolCapable(Protocol):
    """Protocol for providers that support tool/function calling.
    
    Services should check capability at runtime using:
        if isinstance(provider, ToolCapable):
            result = await provider.chat_with_tools(...)
    """
    
    async def chat_with_tools(
        self, 
        messages: List[LLMMessage], 
        tools: List[Dict[str, Any]], 
        **kwargs
    ) -> LLMResponse:
        """Execute chat with tool calling support.
        
        Args:
            messages: List of messages in the conversation
            tools: List of tool definitions in JSON schema format
            **kwargs: Provider-specific options
            
        Returns:
            LLMResponse which may include tool_calls in metadata
        """
        ...
    
    def bind_tools(self, tools: List[Dict[str, Any]]) -> "ToolCapable":
        """Bind tools to the provider for subsequent calls.
        
        Returns a new provider instance with tools bound, or self if mutated.
        """
        ...


@runtime_checkable
class StructuredOutputCapable(Protocol):
    """Protocol for providers that support structured JSON output.
    
    Services should check capability at runtime using:
        if isinstance(provider, StructuredOutputCapable):
            result = await provider.chat_structured(...)
    """
    
    async def chat_structured(
        self,
        messages: List[LLMMessage],
        output_schema: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """Execute chat with structured JSON output.
        
        Args:
            messages: List of messages in the conversation
            output_schema: JSON schema dict defining the output structure
            **kwargs: Provider-specific options
            
        Returns:
            Parsed JSON object matching the schema
        """
        ...


@runtime_checkable
class LangGraphCompatible(Protocol):
    """Protocol for providers compatible with LangGraph nodes.
    
    This protocol allows the adapter to work with existing LangGraph
    graph execution while maintaining the abstraction layer.
    
    Services should check capability at runtime using:
        if isinstance(provider, LangGraphCompatible):
            result = await provider.ainvoke(...)
    """
    
    async def ainvoke(self, input: Any, config: Optional[Any] = None, **kwargs) -> Any:
        """LangGraph-compatible invocation method.
        
        Accepts and returns LangChain message types for compatibility
        with existing graph nodes.
        """
        ...
    
    async def astream(self, input: Any, config: Optional[Any] = None, **kwargs) -> AsyncIterator[Any]:
        """LangGraph-compatible streaming method.
        
        Yields LangChain message chunks for compatibility with
        existing graph nodes.
        """
        ...



