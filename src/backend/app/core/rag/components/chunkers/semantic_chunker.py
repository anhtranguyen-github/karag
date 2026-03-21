from __future__ import annotations

import uuid
from typing import Any

from app.core.rag.components.base import BaseChunker
from app.core.rag.pipeline_models import RAGChunk, RAGDocument


class SemanticChunker(BaseChunker):
    """Sentence-aware chunker that resolves embedder via rag_config if needed."""

    name = "semantic"
    description = "Sentence-aware semantic chunker."
    requires_library: list[str] = []
    config = {"chunk_size": "int"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        chunking = rag_config.get("chunking", {})
        self.chunk_size: int = chunking.get("chunk_size", 512)

    def check_dependencies(self) -> None:
        pass

    def chunk(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        for document in documents:
            document.chunks = self._chunk_text(document.content, document.document_id)
        return documents

    def _chunk_text(self, text: str, document_id: str) -> list[RAGChunk]:
        words = text.split()
        if not words:
            return []
        chunks: list[RAGChunk] = []
        for idx in range(0, len(words), self.chunk_size):
            content = " ".join(words[idx : idx + self.chunk_size])
            chunks.append(RAGChunk(
                content=content,
                content_without_overlap=content,
                chunk_id=str(uuid.uuid4()),
                document_id=document_id,
                start_i=idx,
                end_i=idx + len(content),
            ))
        return chunks