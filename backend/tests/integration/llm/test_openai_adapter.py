from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.app.providers.adapter import LangChainAdapter
from langchain_core.messages import AIMessage


@pytest.mark.asyncio
async def test_adapter_calls_real_llm_blocked(monkeypatch):
    # Mock behavior to simulate real call
    mock_lc = MagicMock()
    mock_lc.ainvoke = AsyncMock(return_value=AIMessage(content="Hello"))

    # Enable test mode protection
    monkeypatch.setenv("TEST_MODE", "true")
    monkeypatch.setenv("ALLOW_REAL_LLM", "false")

    adapter = LangChainAdapter(mock_lc, provider_name="openai")

    with pytest.raises(RuntimeError) as excinfo:
        await adapter.generate_chat([{"role": "user", "content": "Hi"}])

    assert "Attempted to call real LLM provider" in str(excinfo.value)


@pytest.mark.asyncio
async def test_adapter_allows_real_llm_when_marked(monkeypatch):
    mock_lc = MagicMock()
    mock_lc.ainvoke = AsyncMock(
        return_value=AIMessage(content="Hello", response_metadata={"token_usage": {}})
    )

    monkeypatch.setenv("TEST_MODE", "true")
    monkeypatch.setenv("ALLOW_REAL_LLM", "true")

    adapter = LangChainAdapter(mock_lc, provider_name="openai")

    response = await adapter.generate_chat([{"role": "user", "content": "Hi"}])
    assert response.content == "Hello"
