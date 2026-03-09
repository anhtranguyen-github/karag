import os
from app.adapters.providers import LiteLLMProvider, VllmLLMProvider, QwenLocalProvider
from app.core.ports import ChatMessage


def test_litellm_provider_test_fallback():
    # conftest sets TESTING=1 and stubs litellm.completion to a deterministic echo
    provider = LiteLLMProvider()
    messages = [ChatMessage(role="user", content="Unit test ping")]
    completion = provider.chat(messages, model="gpt-4o-mini")
    assert isinstance(completion.content, str)
    assert "Unit test ping" in completion.content


def test_qwen_local_provider_echo():
    provider = QwenLocalProvider()
    messages = [ChatMessage(role="user", content="Hello Qwen")]
    completion = provider.chat(messages)
    assert completion.content.startswith("[qwen-local simulated response]")
    assert "Hello Qwen" in completion.content


def test_vllm_chat_complete_returns_string():
    # With TESTING stubs in place, vLLM provider should use litellm stub and return string
    provider = VllmLLMProvider()
    messages = [ChatMessage(role="user", content="Warmup")]
    result = provider.chat_complete(messages)
    assert isinstance(result, str)
    assert "Warmup" in result
