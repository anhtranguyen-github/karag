from __future__ import annotations

from typing import Any

from app.core.rag.components.base import BaseChatContextManager
from app.core.rag.types import ChatMessage, RetrievedChunk


class DefaultChatContextManager(BaseChatContextManager):
    """Builds structured chat messages from retrieved context and conversation history.

    Responsibilities:
    - Inject system prompt from rag_config
    - Format retrieved chunks into context
    - Manage conversation history truncation (token budget)
    - Separate rag_retrieved_context (knowledge) from chat_context (conversation)
    """

    name = "default"
    description = "Default chat context builder with token-budget truncation."
    requires_library: list[str] = []
    config = {
        "prompt_template": "str",
        "max_context_tokens": "int",
        "context_formatting_template": "str",
    }

    def __init__(self, rag_config: dict[str, Any]) -> None:
        rag = rag_config.get("rag", {})
        self.prompt_template: str = rag.get("prompt_template", "")
        self.max_context_tokens: int = rag.get("max_context_tokens", 4000)
        self.context_formatting_template: str = rag.get(
            "context_formatting_template", "[{index}] {text}"
        )

    def check_dependencies(self) -> None:
        pass

    # ── public interface ─────────────────────────────────

    def build_context(
        self,
        query: str,
        retrieved_chunks: list[RetrievedChunk],
        conversation_history: list[ChatMessage],
        rag_config: dict[str, Any],
    ) -> list[ChatMessage]:
        """Return a list of ChatMessages ready for the generator.

        Structure:
        1. System message (prompt template with injected context)
        2. Truncated conversation history
        3. Current user query
        """
        # 1. Truncate chunks to token budget
        selected_chunks = self._truncate_chunks(retrieved_chunks)

        # 2. Format rag_retrieved_context
        rag_context_str = self._format_chunks(selected_chunks)

        # 3. Build system prompt
        system_content = (
            self.prompt_template
            .replace("{{context}}", rag_context_str)
            .replace("{{question}}", query)
        )

        messages: list[ChatMessage] = [
            ChatMessage(role="system", content=system_content),
        ]

        # 4. Append truncated conversation history
        remaining_budget = max(self.max_context_tokens - self._estimate_tokens(system_content), 0)
        truncated_history = self._truncate_history(conversation_history, remaining_budget)
        messages.extend(truncated_history)

        # 5. Current user query
        messages.append(ChatMessage(role="user", content=query))

        return messages

    # ── internals ────────────────────────────────────────

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        return max(len(text.split()), 1)

    def _truncate_chunks(self, chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
        if self.max_context_tokens <= 0:
            return chunks
        total = 0
        selected: list[RetrievedChunk] = []
        for chunk in chunks:
            tokens = self._estimate_tokens(chunk.text)
            if selected and total + tokens > self.max_context_tokens:
                break
            selected.append(chunk)
            total += tokens
        return selected or chunks[:1]

    def _format_chunks(self, chunks: list[RetrievedChunk]) -> str:
        return "\n".join(
            self.context_formatting_template.format(
                index=i,
                text=chunk.text,
                document_title=chunk.document_title,
                score=f"{chunk.score:.3f}",
            )
            for i, chunk in enumerate(chunks, start=1)
        )

    def _truncate_history(
        self,
        history: list[ChatMessage],
        token_budget: int,
    ) -> list[ChatMessage]:
        if not history:
            return []
        selected: list[ChatMessage] = []
        total = 0
        for msg in reversed(history):
            tokens = self._estimate_tokens(msg.content)
            if total + tokens > token_budget:
                break
            selected.append(msg)
            total += tokens
        selected.reverse()
        return selected
