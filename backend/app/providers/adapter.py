"""LangChain adapter implementing the provider-agnostic LLM interface.

This module contains ALL LangChain dependencies and acts as an isolation layer
between the application and LangChain-specific implementations. No other module
should import LangChain directly.
"""

from __future__ import annotations

import os
from typing import Any, AsyncIterator, Dict, List, Optional

import structlog

# Import only what we need from base module (no LangChain)
from backend.app.providers.base import (
    LLMMessage,
    LLMProvider,
    LLMResponse,
    ToolCapable,
    LangGraphCompatible,
)
from backend.app.core.llm_cache import llm_cache
from backend.app.core.llm_resilience import RateLimitError, APIError

logger = structlog.get_logger(__name__)


class LangChainAdapter(LLMProvider, ToolCapable, LangGraphCompatible):
    """Adapter that wraps LangChain chat models.

    This adapter implements the core LLMProvider interface while maintaining
    compatibility with LangGraph nodes through the LangGraphCompatible protocol.

    All LangChain-specific logic is contained within this class.
    """

    def __init__(self, llm: Any, provider_name: str, model_name: Optional[str] = None):
        """Initialize the adapter.

        Args:
            llm: The underlying LangChain chat model (type Any to avoid external import)
            provider_name: Identifier for the provider (e.g., 'openai', 'azure')
            model_name: The model identifier (if None, extracted from llm)
        """
        self._llm = llm  # The underlying LangChain model
        self._provider_name = provider_name
        self._model_name = model_name or self._extract_model_name(llm)
        self._bound_tools: Optional[List[Dict[str, Any]]] = None

        # Security check: if in test mode, ensure we are not calling real APIs
        # unless explicitly allowed.
        self._is_test = os.getenv("TEST_MODE", "false").lower() == "true"
        self._allow_real_llm = os.getenv("ALLOW_REAL_LLM", "false").lower() == "true"

    def _extract_model_name(self, llm: Any) -> str:
        """Extract model name from LangChain model."""
        # Try common attribute names
        for attr in ["model", "model_name", "model_id", "deployment_name"]:
            if hasattr(llm, attr):
                value = getattr(llm, attr)
                if value:
                    return str(value)
        return "unknown"

    @property
    def provider_name(self) -> str:
        """Return the provider identifier."""
        return self._provider_name

    @property
    def model_name(self) -> str:
        """Return the model identifier."""
        return self._model_name

    def _check_test_mode(self):
        """Prevent accidental real API calls during tests."""
        if self._is_test and not self._allow_real_llm:
            raise RuntimeError(
                f"Attempted to call real LLM provider ({self._provider_name}) during tests. "
                "Use deterministic mocks for unit tests or ALLOW_REAL_LLM=true for canary tests."
            )

    def _convert_to_lc_messages(self, messages: List[LLMMessage]) -> List[Any]:
        """Convert provider-agnostic messages to LangChain messages.

        This is an internal method that isolates LangChain message types.
        """
        # Import LangChain types internally
        from langchain_core.messages import (
            HumanMessage,
            AIMessage,
            SystemMessage,
            ToolMessage,
            FunctionMessage,
        )

        lc_messages = []
        for msg in messages:
            role = msg.role.lower()
            content = msg.content or ""

            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                lc_msg = AIMessage(content=content)
                # Handle tool calls if present
                if msg.tool_calls:
                    lc_msg.tool_calls = msg.tool_calls
                lc_messages.append(lc_msg)
            elif role == "tool":
                # Tool messages require tool_call_id
                tool_msg = ToolMessage(
                    content=content,
                    tool_call_id=msg.tool_call_id or "",
                    name=msg.name,
                )
                lc_messages.append(tool_msg)
            elif role == "function":
                # Legacy function message support
                lc_messages.append(
                    FunctionMessage(content=content, name=msg.name or "")
                )
            else:  # user is default
                lc_messages.append(HumanMessage(content=content))

        return lc_messages

    def _convert_from_lc_response(self, lc_response: Any) -> LLMResponse:
        """Convert LangChain response to standardized LLMResponse."""
        # Extract content
        content = getattr(lc_response, "content", "")
        if not isinstance(content, str):
            content = str(content)

        # Extract usage metadata
        usage = getattr(lc_response, "usage_metadata", None) or {}
        if not isinstance(usage, dict):
            usage = {}

        # Extract response metadata
        metadata = getattr(lc_response, "response_metadata", None) or {}
        if not isinstance(metadata, dict):
            metadata = {}

        # Extract finish reason
        finish_reason = None
        if hasattr(lc_response, "response_metadata") and lc_response.response_metadata:
            finish_reason = lc_response.response_metadata.get("finish_reason")

        # Extract tool calls if present
        tool_calls = getattr(lc_response, "tool_calls", None)
        if tool_calls:
            metadata["tool_calls"] = tool_calls

        # Extract additional kwargs
        additional_kwargs = getattr(lc_response, "additional_kwargs", None)
        if additional_kwargs:
            metadata["additional_kwargs"] = additional_kwargs

        return LLMResponse(
            content=content,
            model=self._model_name,
            provider=self._provider_name,
            usage=usage,
            metadata=metadata,
            finish_reason=finish_reason,
        )

    async def chat(self, messages: List[LLMMessage], **kwargs) -> LLMResponse:
        """Execute a chat completion request.

        Args:
            messages: List of messages in the conversation
            **kwargs: Provider-specific options

        Returns:
            Standardized LLMResponse
        """
        self._check_test_mode()

        # Build prompt from messages for caching
        prompt = self._messages_to_prompt(messages)
        temperature = kwargs.get("temperature", 1.0)

        # Check cache for deterministic requests
        if temperature == 0:
            cached = await llm_cache.get(
                llm_cache._cache_key(
                    prompt, self._model_name, self._provider_name, **kwargs
                )
            )
            if cached:
                logger.debug("llm_cache_hit", provider=self._provider_name)
                response = cached["response"]
                response["_cached"] = True
                return LLMResponse(**response)

        lc_messages = self._convert_to_lc_messages(messages)

        try:
            response = await self._llm.ainvoke(lc_messages, **kwargs)
            result = self._convert_from_lc_response(response)

            # Cache deterministic responses
            if temperature == 0:
                await llm_cache.set(
                    llm_cache._cache_key(
                        prompt, self._model_name, self._provider_name, **kwargs
                    ),
                    {"response": result.model_dump()},
                    temperature=temperature,
                )

            return result
        except Exception as e:
            logger.error(
                "chat_completion_failed",
                provider=self._provider_name,
                model=self._model_name,
                error=str(e),
            )
            # Convert to typed exceptions for retry logic
            if "rate limit" in str(e).lower():
                raise RateLimitError(str(e))
            elif any(code in str(e) for code in ["500", "502", "503", "504"]):
                raise APIError(str(e), status_code=500)
            raise

    def _messages_to_prompt(self, messages: List[LLMMessage]) -> str:
        """Convert messages to a string prompt for caching."""
        parts = []
        for msg in messages:
            role = msg.role.capitalize()
            parts.append(f"{role}: {msg.content}")
        return "\n".join(parts)

    async def stream(self, messages: List[LLMMessage], **kwargs) -> AsyncIterator[str]:
        """Execute a streaming chat completion request.

        Args:
            messages: List of messages in the conversation
            **kwargs: Provider-specific options

        Yields:
            Text chunks as they are generated
        """
        self._check_test_mode()

        lc_messages = self._convert_to_lc_messages(messages)

        try:
            async for chunk in self._llm.astream(lc_messages, **kwargs):
                content = getattr(chunk, "content", "")
                if content:
                    yield content
        except Exception as e:
            logger.error(
                "stream_completion_failed",
                provider=self._provider_name,
                model=self._model_name,
                error=str(e),
            )
            raise

    # =========================================================================
    # ToolCapable Implementation
    # =========================================================================

    async def chat_with_tools(
        self, messages: List[LLMMessage], tools: List[Dict[str, Any]], **kwargs
    ) -> LLMResponse:
        """Execute chat with tool calling support.

        Args:
            messages: List of messages in the conversation
            tools: List of tool definitions in JSON schema format
            **kwargs: Provider-specific options

        Returns:
            LLMResponse which may include tool_calls in metadata
        """
        self._check_test_mode()

        lc_messages = self._convert_to_lc_messages(messages)

        try:
            # Bind tools to the LLM
            bound_llm = self._llm.bind_tools(tools)
            response = await bound_llm.ainvoke(lc_messages, **kwargs)
            return self._convert_from_lc_response(response)
        except Exception as e:
            logger.error(
                "chat_with_tools_failed",
                provider=self._provider_name,
                model=self._model_name,
                error=str(e),
            )
            raise

    def bind_tools(self, tools: List[Dict[str, Any]]) -> "LangChainAdapter":
        """Bind tools to the provider for subsequent calls.

        Returns a new adapter instance with tools bound to the underlying LLM.
        """
        # Create a new LLM instance with tools bound
        bound_llm = self._llm.bind_tools(tools)

        # Create new adapter with bound LLM
        new_adapter = LangChainAdapter(
            llm=bound_llm,
            provider_name=self._provider_name,
            model_name=self._model_name,
        )
        new_adapter._bound_tools = tools
        return new_adapter

    # =========================================================================
    # LangGraphCompatible Implementation
    # =========================================================================

    async def ainvoke(self, input: Any, config: Optional[Any] = None, **kwargs) -> Any:
        """LangGraph-compatible invocation method.

        This method accepts and returns LangChain message types for compatibility
        with existing LangGraph graph nodes. It does NOT convert to/from LLMMessage.

        Args:
            input: LangChain message or list of messages
            config: Optional LangChain run configuration
            **kwargs: Additional arguments

        Returns:
            LangChain response message
        """
        self._check_test_mode()
        return await self._llm.ainvoke(input, config=config, **kwargs)

    async def astream(
        self, input: Any, config: Optional[Any] = None, **kwargs
    ) -> AsyncIterator[Any]:
        """LangGraph-compatible streaming method.

        This method yields LangChain message chunks for compatibility with
        existing LangGraph graph nodes.

        Args:
            input: LangChain message or list of messages
            config: Optional LangChain run configuration
            **kwargs: Additional arguments

        Yields:
            LangChain message chunks
        """
        self._check_test_mode()
        async for chunk in self._llm.astream(input, config=config, **kwargs):
            yield chunk
