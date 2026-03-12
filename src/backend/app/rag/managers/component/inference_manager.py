from __future__ import annotations

import logging
import time
from typing import Any, AsyncGenerator, Type

from app.rag.components.base import BaseInference
from app.rag.components.inference.openai_inference import OpenAIInference
from app.rag.schemas.types import ChatMessage

logger = logging.getLogger(__name__)


class InferenceManager:
    """Orchestrator for inference (generation) components."""

    def __init__(self) -> None:
        self.engines: dict[str, Type[BaseInference]] = {
            "openai": OpenAIInference,
        }

    def available_components(self) -> list[str]:
        return list(self.engines.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseInference:
        name = rag_config.get("rag", {}).get("generator") or "openai"
        if name not in self.engines:
            raise ValueError(f"Inference engine '{name}' not registered. Available: {list(self.engines.keys())}")
        component = self.engines[name](rag_config)
        return component

    def _preprocess(self, messages: list[ChatMessage]) -> list[ChatMessage]:
        """Placeholder for request validation and normalization."""
        return messages

    def _postprocess(self, answer: str) -> str:
        """Placeholder for output cleaning and citation normalization."""
        return answer.strip()

    async def process(
        self,
        rag_config: dict[str, Any],
        messages: list[ChatMessage],
    ) -> str:
        """Inference Pipeline: Preprocess -> Infer -> Postprocess."""
        # 1. Preprocess
        messages = self._preprocess(messages)
        
        # 2. Infer
        engine = self.resolve(rag_config)
        logger.info("Inference engine [%s] starting", engine.name)
        start = time.perf_counter()

        answer = await engine.infer(messages, rag_config)

        # 3. Postprocess
        answer = self._postprocess(answer)

        elapsed = time.perf_counter() - start
        logger.info("Inference engine [%s] completed in %.1fms", engine.name, elapsed * 1000)
        return answer

    async def process_stream(
        self,
        rag_config: dict[str, Any],
        messages: list[ChatMessage],
    ) -> AsyncGenerator[str, None]:
        """Stream answer tokens."""
        messages = self._preprocess(messages)
        engine = self.resolve(rag_config)
        logger.info("Inference engine [%s] streaming answer", engine.name)
        async for token in engine.infer_stream(messages, rag_config):
            yield token