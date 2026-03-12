from __future__ import annotations
from typing import Any
from app.rag.components.base import BaseChatContextManager
from app.rag.schemas.types import ChatMessage, RetrievedChunk

class SimpleChatContext(BaseChatContextManager):
    """Simple chat context builder."""
    name = "simple"
    description = "Formats results into a list of messages using a standard prompt."
    requirement = []
    config = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass



    def build_context(
        self,
        query: str,
        retrieved_chunks: list[RetrievedChunk],
        conversation_history: list[ChatMessage],
        rag_config: dict[str, Any],
    ) -> list[ChatMessage]:
        # 1. Token Budgeting (Word count proxy for demo)
        max_context_words = rag_config.get("rag", {}).get("max_context_words", 2000)
        current_words = 0
        selected_chunks = []
        
        for chunk in retrieved_chunks:
            chunk_words = len(chunk.text.split())
            if current_words + chunk_words > max_context_words:
                break
            selected_chunks.append(chunk)
            current_words += chunk_words

        # 2. Form context with Provenance
        context_parts = []
        for i, c in enumerate(selected_chunks):
            source = c.document_title or c.document_id or "Unknown Source"
            context_parts.append(f"[Document {i+1}] Source: {source}\nContent: {c.text}")
        
        context_str = "\n\n".join(context_parts)
        
        # 3. Enhanced System Prompt with Directives
        system_content = (
            "You are a helpful assistant. Use the following pieces of context to answer the user's question.\n"
            "DIRECTIVES:\n"
            "- Do not invent facts. If the answer is not in the context, say you don't know.\n"
            "- Cite your sources using [Document X] markers.\n\n"
            f"Context:\n{context_str}"
        )
        
        system_msg = ChatMessage(role="system", content=system_content)
        
        results = [system_msg]
        results.extend(conversation_history)
        results.append(ChatMessage(role="user", content=query))
        
        return results
