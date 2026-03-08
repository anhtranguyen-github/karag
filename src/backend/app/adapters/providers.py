from __future__ import annotations

import json
import os
import time
from hashlib import sha256
from typing import Sequence
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.ports import ChatCompletion, ChatMessage, EmbeddingProvider, LLMProvider


def _vectorize(text: str, dimensions: int = 8) -> list[float]:
    digest = sha256(text.encode("utf-8")).digest()
    return [round(digest[index] / 255, 4) for index in range(dimensions)]


def _join_message_content(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            item.get("text", "")
            for item in content
            if isinstance(item, dict) and item.get("type") == "text"
        )
    return str(content)


class _OpenAIClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def post(self, path: str, payload: dict[str, object]) -> dict[str, object]:
        body = json.dumps(payload).encode("utf-8")
        request = Request(
            f"{self.base_url}{path}",
            data=body,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"OpenAI API request failed with {exc.code}: {detail[:400]}") from exc
        except URLError as exc:
            raise RuntimeError(f"OpenAI API connection failed: {exc.reason}") from exc


class _EmbeddingProviderBase(EmbeddingProvider):
    def __init__(self, name: str, models: list[str]) -> None:
        self.name = name
        self._models = models

    def embed_texts(self, texts: Sequence[str], model: str | None = None) -> list[list[float]]:
        _ = model or self._models[0]
        return [_vectorize(text) for text in texts]

    def list_models(self) -> list[str]:
        return list(self._models)


class _LLMProviderBase(LLMProvider):
    def __init__(self, name: str, models: list[str]) -> None:
        self.name = name
        self._models = models

    def chat(self, messages: Sequence[ChatMessage], model: str | None = None) -> ChatCompletion:
        selected_model = model or self._models[0]
        prompt = messages[-1].content if messages else ""
        content = (
            f"{self.name}::{selected_model} synthesized an answer from the supplied context. "
            f"Prompt excerpt: {prompt[:120]}"
        )
        prompt_tokens = max(len(prompt.split()), 1)
        completion_tokens = max(len(content.split()), 1)
        return ChatCompletion(
            model=selected_model,
            content=content,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            latency_ms=42,
        )

    def list_models(self) -> list[str]:
        return list(self._models)


class OllamaEmbeddingProvider(_EmbeddingProviderBase):
    def __init__(self) -> None:
        super().__init__("ollama", ["nomic-embed-text", "bge-m3"])


class VllmEmbeddingProvider(_EmbeddingProviderBase):
    def __init__(self) -> None:
        super().__init__("vllm", ["bge-large-en-v1.5"])


class OpenAIEmbeddingProvider(_EmbeddingProviderBase):
    def __init__(self) -> None:
        super().__init__("openai", ["text-embedding-3-small", "text-embedding-3-large"])
        self._client = _OpenAIClient()

    def embed_texts(self, texts: Sequence[str], model: str | None = None) -> list[list[float]]:
        if not self._client.enabled:
            return super().embed_texts(texts, model=model)
        response = self._client.post(
            "/embeddings",
            {"model": model or self._models[0], "input": list(texts)},
        )
        data = response.get("data", [])
        return [list(item.get("embedding", [])) for item in data if isinstance(item, dict)]


class OllamaLLMProvider(_LLMProviderBase):
    def __init__(self) -> None:
        super().__init__("ollama", ["llama3.1:8b", "mistral:7b"])


class VllmLLMProvider(_LLMProviderBase):
    def __init__(self) -> None:
        super().__init__("vllm", ["meta-llama/Llama-3.1-8B-Instruct"])


class OpenAILLMProvider(_LLMProviderBase):
    def __init__(self) -> None:
        super().__init__("openai", ["gpt-4o-mini", "gpt-4.1-mini"])
        self._client = _OpenAIClient()

    def chat(self, messages: Sequence[ChatMessage], model: str | None = None) -> ChatCompletion:
        if not self._client.enabled:
            return super().chat(messages, model=model)
        selected_model = model or self._models[0]
        start = time.perf_counter()
        response = self._client.post(
            "/chat/completions",
            {
                "model": selected_model,
                "messages": [
                    {"role": message.role, "content": message.content}
                    for message in messages
                ],
            },
        )
        latency_ms = int((time.perf_counter() - start) * 1000)
        choice = response.get("choices", [{}])[0]
        message = choice.get("message", {}) if isinstance(choice, dict) else {}
        content = _join_message_content(message.get("content", ""))
        usage = response.get("usage", {}) if isinstance(response.get("usage"), dict) else {}
        prompt_tokens = int(usage.get("prompt_tokens", max(len(messages), 1)))
        completion_tokens = int(usage.get("completion_tokens", max(len(content.split()), 1)))
        total_tokens = int(usage.get("total_tokens", prompt_tokens + completion_tokens))
        return ChatCompletion(
            model=selected_model,
            content=content,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
        )


class AnthropicLLMProvider(_LLMProviderBase):
    def __init__(self) -> None:
        super().__init__("anthropic", ["claude-3-5-sonnet-latest"])
