from __future__ import annotations

import logging
import time
from typing import Any, AsyncGenerator, Type

from app.core.rag.components.base import BaseGenerator
from app.core.rag.components.generators.openai_generator import OpenAIGenerator
from app.core.rag.types import ChatMessage

logger = logging.getLogger(__name__)


class GeneratorManager:
    """Orchestrator for generator components."""

    def __init__(self) -> None:
        self.generators: dict[str, Type[BaseGenerator]] = {
            "openai": OpenAIGenerator,
        }

    def available_components(self) -> list[str]:
        return list(self.generators.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseGenerator:
        name = rag_config.get("rag", {}).get("generator", "")
        if name not in self.generators:
            raise ValueError(f"Generator '{name}' not registered. Available: {list(self.generators.keys())}")
        component = self.generators[name](rag_config)
        component.check_dependencies()
        return component

    async def process(
        self,
        rag_config: dict[str, Any],
        messages: list[ChatMessage],
    ) -> str:
        """Generate an answer from messages."""
        generator = self.resolve(rag_config)
        logger.info("Generator [%s] generating answer", generator.name)
        start = time.perf_counter()

        answer = await generator.generate(messages, rag_config)

        elapsed = time.perf_counter() - start
        logger.info("Generator [%s] done in %.1fms", generator.name, elapsed * 1000)
        return answer

    async def process_stream(
        self,
        rag_config: dict[str, Any],
        messages: list[ChatMessage],
    ) -> AsyncGenerator[str, None]:
        """Stream answer tokens."""
        generator = self.resolve(rag_config)
        logger.info("Generator [%s] streaming answer", generator.name)
        async for token in generator.generate_stream(messages, rag_config):
            yield token