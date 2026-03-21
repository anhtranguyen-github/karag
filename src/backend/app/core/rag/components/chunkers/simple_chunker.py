from __future__ import annotations

import uuid
from typing import Any

from app.core.rag.components.base import BaseChunker
from app.core.rag.pipeline_models import RAGChunk, RAGDocument


class SimpleChunker(BaseChunker):
    """Fixed-size character chunker with overlap support."""

    name = "simple"
    description = "Fixed-size character chunker with overlap support."
    requires_library: list[str] = []
    config = {"chunk_size": "int", "chunk_overlap": "int"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        chunking = rag_config.get("chunking", {})
        self.chunk_size: int = chunking.get("chunk_size", 512)
        self.chunk_overlap: int = chunking.get("chunk_overlap", 64)

    def check_dependencies(self) -> None:
        pass

    def chunk(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        for document in documents:
            document.chunks = self._chunk_text(document.content, document.document_id)
        return documents

    def _chunk_text(self, text: str, document_id: str) -> list[RAGChunk]:
        if not text:
            return []
        chunks: list[RAGChunk] = []
        start = 0
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            content = text[start:end]
            overlap_start = max(start, start + self.chunk_overlap) if start > 0 else start
            chunks.append(RAGChunk(
                content=content,
                content_without_overlap=text[overlap_start:end] if start > 0 else content,
                chunk_id=str(uuid.uuid4()),
                document_id=document_id,
                start_i=start,
                end_i=end,
            ))
            step = self.chunk_size - self.chunk_overlap
            if step <= 0:
                break
            start += step
        return chunks
