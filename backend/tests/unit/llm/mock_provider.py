from typing import Any, AsyncIterator, Dict, List, Optional
from backend.app.providers.base import ILLMProvider, LLMResponse
from langchain_core.messages import AIMessage

class MockLLMProvider(ILLMProvider):
    def __init__(self, responses: List[str] = None, provider_name: str = "mock"):
        self._responses = responses or ["Default mock response"]
        self._current_index = 0
        self._provider_name = provider_name
        self._calls = []

    @property
    def provider_name(self) -> str:
        return self._provider_name

    async def generate_chat(self, messages: List[Dict[str, str]], **kwargs) -> LLMResponse:
        self._calls.append({"messages": messages, "kwargs": kwargs})
        content = self._responses[self._current_index % len(self._responses)]
        self._current_index += 1
        return LLMResponse(
            content=content,
            usage={"input_tokens": 10, "output_tokens": len(content.split())},
            metadata={"model": "mock-model"}
        )

    async def generate_stream(self, messages: List[Dict[str, str]], **kwargs) -> AsyncIterator[str]:
        response = await self.generate_chat(messages, **kwargs)
        for word in response.content.split():
            yield word + " "

    # LangChain compatibility
    async def ainvoke(self, input: Any, config: Optional[Any] = None, **kwargs: Any) -> AIMessage:
        # Simple implementation for tests
        content = self._responses[self._current_index % len(self._responses)]
        self._current_index += 1
        return AIMessage(content=content)

    @property
    def calls(self):
        return self._calls
