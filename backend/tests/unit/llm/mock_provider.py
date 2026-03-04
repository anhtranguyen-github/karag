"""Mock LLM provider for testing.

This module provides a mock implementation of the LLMProvider interface
for use in unit tests. It does not depend on LangChain.
"""

from __future__ import annotations

from typing import Any, AsyncIterator, Dict, List, Optional

from backend.app.providers.base import (
    LLMMessage,
    LLMProvider,
    LLMResponse,
    ToolCapable,
)


class MockLLMProvider(LLMProvider, ToolCapable):
    """Mock provider for testing.
    
    This mock implements the LLMProvider interface and ToolCapable protocol
    for use in unit tests. It records call history and returns predetermined
    responses.
    """
    
    def __init__(
        self,
        responses: Optional[List[str]] = None,
        provider_name: str = "mock",
        model_name: str = "mock-model",
    ):
        """Initialize the mock provider.
        
        Args:
            responses: List of responses to cycle through
            provider_name: Provider identifier
            model_name: Model identifier
        """
        self._responses = responses or ["Default mock response"]
        self._provider_name = provider_name
        self._model_name = model_name
        self._bound_tools: Optional[List[Dict[str, Any]]] = None
        
        # Call history for verification
        self.call_history: List[Dict[str, Any]] = []
        self._response_index = 0
    
    @property
    def provider_name(self) -> str:
        """Return the provider identifier."""
        return self._provider_name
    
    @property
    def model_name(self) -> str:
        """Return the model identifier."""
        return self._model_name
    
    def _get_next_response(self) -> str:
        """Get the next response in the cycle."""
        response = self._responses[self._response_index % len(self._responses)]
        self._response_index += 1
        return response
    
    async def chat(self, messages: List[LLMMessage], **kwargs) -> LLMResponse:
        """Execute a chat completion request.
        
        Records the call and returns a predetermined response.
        """
        self.call_history.append({
            "method": "chat",
            "messages": messages,
            "kwargs": kwargs,
        })
        
        content = self._get_next_response()
        
        return LLMResponse(
            content=content,
            model=self._model_name,
            provider=self._provider_name,
            usage={
                "input_tokens": sum(len(m.content.split()) for m in messages) * 2,
                "output_tokens": len(content.split()),
            },
            metadata={"mock": True},
            finish_reason="stop",
        )
    
    async def stream(self, messages: List[LLMMessage], **kwargs) -> AsyncIterator[str]:
        """Execute a streaming chat completion request.
        
        Records the call and yields the response word by word.
        """
        self.call_history.append({
            "method": "stream",
            "messages": messages,
            "kwargs": kwargs,
        })
        
        content = self._get_next_response()
        words = content.split()
        
        for word in words:
            yield word + " "
    
    # =============================================================================
    # ToolCapable Implementation
    # =============================================================================
    
    async def chat_with_tools(
        self,
        messages: List[LLMMessage],
        tools: List[Dict[str, Any]],
        **kwargs
    ) -> LLMResponse:
        """Execute chat with tool calling support.
        
        Records the call and returns a response that may include tool calls.
        """
        self.call_history.append({
            "method": "chat_with_tools",
            "messages": messages,
            "tools": tools,
            "kwargs": kwargs,
        })
        
        content = self._get_next_response()
        
        # Simulate a tool call if tools are provided
        metadata: Dict[str, Any] = {"mock": True, "tools_provided": len(tools)}
        
        # For testing, if the content starts with "TOOL:", simulate a tool call
        if content.startswith("TOOL:"):
            tool_name = content.replace("TOOL:", "").strip()
            metadata["tool_calls"] = [{
                "id": "call_123",
                "type": "function",
                "function": {
                    "name": tool_name,
                    "arguments": "{}",
                },
            }]
            content = f"I'll help you with that using {tool_name}."
        
        return LLMResponse(
            content=content,
            model=self._model_name,
            provider=self._provider_name,
            usage={
                "input_tokens": sum(len(m.content.split()) for m in messages) * 2,
                "output_tokens": len(content.split()),
            },
            metadata=metadata,
            finish_reason="stop",
        )
    
    def bind_tools(self, tools: List[Dict[str, Any]]) -> "MockLLMProvider":
        """Bind tools to the provider for subsequent calls.
        
        Returns a new mock provider with tools bound.
        """
        new_mock = MockLLMProvider(
            responses=self._responses.copy(),
            provider_name=self._provider_name,
            model_name=self._model_name,
        )
        new_mock._bound_tools = tools
        new_mock.call_history = self.call_history
        return new_mock
    
    async def ainvoke(self, input: Any, config: Optional[Any] = None, **kwargs) -> Any:
        """LangGraph-compatible invocation for testing."""
        self.call_history.append({
            "method": "ainvoke",
            "input": input,
            "config": config,
            "kwargs": kwargs,
        })
        
        # Simple implementation - return the last message content as AIMessage-like
        content = self._get_next_response()
        
        # Return a simple object with content attribute
        class MockMessage:
            def __init__(self, content: str):
                self.content = content
                self.usage_metadata = {"input_tokens": 10, "output_tokens": 5}
                self.response_metadata = {"mock": True}
        
        return MockMessage(content)
    
    async def astream(self, input: Any, config: Optional[Any] = None, **kwargs) -> AsyncIterator[Any]:
        """LangGraph-compatible streaming for testing."""
        self.call_history.append({
            "method": "astream",
            "input": input,
            "config": config,
            "kwargs": kwargs,
        })
        
        content = self._get_next_response()
        words = content.split()
        
        for word in words:
            class MockChunk:
                def __init__(self, content: str):
                    self.content = content
            
            yield MockChunk(word + " ")
    
    # =============================================================================
    # Test Helpers
    # =============================================================================
    
    @property
    def calls(self) -> List[Dict[str, Any]]:
        """Return the call history for verification."""
        return self.call_history
    
    def assert_called_with(self, method: str, **kwargs) -> bool:
        """Assert that a method was called with specific arguments.
        
        Args:
            method: Method name to check
            **kwargs: Expected keyword arguments
            
        Returns:
            True if a matching call was found
            
        Raises:
            AssertionError: if no matching call was found
        """
        for call in self.call_history:
            if call.get("method") == method:
                match = True
                for key, value in kwargs.items():
                    if call.get(key) != value:
                        match = False
                        break
                if match:
                    return True
        
        raise AssertionError(
            f"Expected call to {method} with {kwargs}, "
            f"but no matching call found in {self.call_history}"
        )
    
    def reset(self):
        """Reset the call history."""
        self.call_history = []
        self._response_index = 0
