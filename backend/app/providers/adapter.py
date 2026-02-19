import os
import structlog
from typing import Any, AsyncIterator, Dict, List, Optional
from backend.app.providers.base import ILLMProvider, LLMResponse
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel

logger = structlog.get_logger(__name__)


class LangChainAdapter(ILLMProvider):
    def __init__(self, llm: BaseChatModel, provider_name: str):
        self._llm = llm
        self._provider_name = provider_name

        # Security check: if in test mode, ensure we are not calling real APIs
        # unless explicitly allowed.
        self._is_test = os.getenv("TEST_MODE", "false").lower() == "true"
        self._allow_real_llm = os.getenv("ALLOW_REAL_LLM", "false").lower() == "true"

        if self._is_test and not self._allow_real_llm:
            # We will use a wrapper that fails if called
            pass

    @property
    def provider_name(self) -> str:
        return self._provider_name

    def _convert_messages(self, messages: List[Dict[str, str]]) -> List[BaseMessage]:
        converted = []
        for m in messages:
            role = m.get("role", "user").lower()
            content = m.get("content", "")
            if role == "system":
                converted.append(SystemMessage(content=content))
            elif role == "assistant":
                converted.append(AIMessage(content=content))
            else:
                converted.append(HumanMessage(content=content))
        return converted

    async def generate_chat(
        self, messages: List[Dict[str, str]], **kwargs
    ) -> LLMResponse:
        self._check_test_mode()

        lc_messages = self._convert_messages(messages)
        response = await self._llm.ainvoke(lc_messages, **kwargs)

        return LLMResponse(
            content=response.content,
            usage=getattr(response, "usage_metadata", {}) or {},
            metadata=getattr(response, "response_metadata", {}),
        )

    async def generate_stream(
        self, messages: List[Dict[str, str]], **kwargs
    ) -> AsyncIterator[str]:
        self._check_test_mode()

        lc_messages = self._convert_messages(messages)
        async for chunk in self._llm.astream(lc_messages, **kwargs):
            yield chunk.content

    def _check_test_mode(self):
        if self._is_test and not self._allow_real_llm:
            raise RuntimeError(
                f"Attempted to call real LLM provider ({self._provider_name}) during tests. "
                "Use deterministic mocks for unit tests or ALLOW_REAL_LLM=true for canary tests."
            )

    # Proxy methods for LangChain compatibility
    async def ainvoke(
        self, input: Any, config: Optional[Any] = None, **kwargs: Any
    ) -> Any:
        self._check_test_mode()
        return await self._llm.ainvoke(input, config=config, **kwargs)

    async def astream(
        self, input: Any, config: Optional[Any] = None, **kwargs: Any
    ) -> AsyncIterator[Any]:
        self._check_test_mode()
        async for chunk in self._llm.astream(input, config=config, **kwargs):
            yield chunk

    def bind_tools(self, tools: List[Any], **kwargs: Any) -> "LangChainAdapter":
        # bind_tools returns a new model, we should wrap it too
        bound_llm = self._llm.bind_tools(tools, **kwargs)
        return LangChainAdapter(bound_llm, provider_name=self._provider_name)

    def __getattr__(self, name: str) -> Any:
        # Proxy other attributes to the underlying LLM
        return getattr(self._llm, name)
