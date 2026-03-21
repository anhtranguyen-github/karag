from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.core.rag.components.base import BaseChatContextManager
from app.core.rag.components.chat_context.default_chat_context import DefaultChatContextManager
from app.core.rag.types import ChatMessage, RetrievedChunk

logger = logging.getLogger(__name__)


class ChatContextManager:
    """Orchestrator for chat context components."""

    def __init__(self) -> None:
        self.context_managers: dict[str, Type[BaseChatContextManager]] = {
            "default": DefaultChatContextManager,
        }

    def available_components(self) -> list[str]:
        return list(self.context_managers.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseChatContextManager:
        name = rag_config.get("rag", {}).get("chat_context", "") or "default"
        if name not in self.context_managers:
            raise ValueError(f"ChatContext '{name}' not registered. Available: {list(self.context_managers.keys())}")
        component = self.context_managers[name](rag_config)
        component.check_dependencies()
        return component

    def process(
        self,
        rag_config: dict[str, Any],
        query: str,
        retrieved_chunks: list[RetrievedChunk],
        conversation_history: list[ChatMessage] | None = None,
    ) -> list[ChatMessage]:
        """Build structured chat messages for the generator."""
        ctx_manager = self.resolve(rag_config)
        logger.info("ChatContext [%s] building messages", ctx_manager.name)
        start = time.perf_counter()

        messages = ctx_manager.build_context(
            query=query,
            retrieved_chunks=retrieved_chunks,
            conversation_history=conversation_history or [],
            rag_config=rag_config,
        )

        elapsed = time.perf_counter() - start
        logger.info(
            "ChatContext [%s] built %d message(s) in %.1fms",
            ctx_manager.name,
            len(messages),
            elapsed * 1000,
        )
        return messages
