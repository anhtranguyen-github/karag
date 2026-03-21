from __future__ import annotations

from typing import Any

from app.core.rag.components.base import BaseQueryTransformer


class HyDEQueryTransformer(BaseQueryTransformer):
    """Hypothetical Document Embedding — generates a temporary answer to improve retrieval.

    Resolves the LLM service internally from rag_config.
    """

    name = "hyde"
    description = "Hypothetical Document Embedding (HyDE) - generates a temporary answer to improve retrieval."
    requires_library: list[str] = []
    config = {"llm": "LlmConfig"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass

    def check_dependencies(self) -> None:
        pass

    async def transform(self, query: str, rag_config: dict[str, Any]) -> str:
        from app.core.rag.managers.generator_manager import GeneratorManager
        from app.core.rag.types import ChatMessage

        generator = GeneratorManager().resolve(rag_config)
        prompt = f"Write a concise factual document that directly answers: {query}"
        messages = [ChatMessage(role="user", content=prompt)]
        return await generator.generate(messages, rag_config)