from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.rag.components.base import BaseChatContextManager
from app.rag.components.chat_context.simple_context import SimpleChatContext
from app.rag.schemas.types import ChatMessage, RetrievedChunk

logger = logging.getLogger(__name__)

class ChatContextManager:
    """Orchestrator for chat context building components."""

    def __init__(self) -> None:
        self.context_managers: dict[str, Type[BaseChatContextManager]] = {
            "simple": SimpleChatContext,
        }

    def available_components(self) -> list[str]:
        return list(self.context_managers.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseChatContextManager:
        name = rag_config.get("rag", {}).get("chat_context")
        if not name:
            raise ValueError("No chat_context specified in 'rag.chat_context' config.")
        if name not in self.context_managers:
            raise ValueError(f"ChatContext '{name}' not registered. Available: {list(self.context_managers.keys())}")
        component = self.context_managers[name](rag_config)
        return component

    def process(
        self,
        rag_config: dict[str, Any],
        query: str,
        retrieved_chunks: list[RetrievedChunk],
        conversation_history: list[ChatMessage],
    ) -> list[ChatMessage]:
        """Build chat context from query + chunks + history."""
        context_manager = self.resolve(rag_config)
        logger.info("ChatContext [%s] starting for query", context_manager.name)
        start = time.perf_counter()

        messages = context_manager.build_context(
            query=query,
            retrieved_chunks=retrieved_chunks,
            conversation_history=conversation_history,
            rag_config=rag_config,
        )

        elapsed = time.perf_counter() - start
        logger.info("ChatContext [%s] produced %d messages in %.1fms", 
                    context_manager.name, len(messages), elapsed * 1000)
        return messages
