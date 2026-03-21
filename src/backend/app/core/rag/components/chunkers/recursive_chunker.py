from __future__ import annotations

import uuid
from typing import Any, List

from app.core.rag.components.base import BaseChunker
from app.core.rag.pipeline_models import RAGChunk, RAGDocument


class RecursiveChunker(BaseChunker):
    """Recursive character chunker splitting by separator hierarchy."""

    name = "recursive"
    description = "Recursive character chunker splitting by hierarchy (\\n\\n, \\n, space, none)."
    requires_library: list[str] = []
    config = {"chunk_size": "int", "chunk_overlap": "int", "separators": "List[str]"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        chunking = rag_config.get("chunking", {})
        self.chunk_size: int = chunking.get("chunk_size", 1000)
        self.chunk_overlap: int = chunking.get("chunk_overlap", 200)
        self.separators: list[str] = chunking.get("separators", ["\n\n", "\n", " ", ""])

    def check_dependencies(self) -> None:
        pass

    def chunk(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        for document in documents:
            document.chunks = self._build_chunks(document.content, document.document_id)
        return documents

    def _build_chunks(self, text: str, document_id: str) -> list[RAGChunk]:
        if not text:
            return []
        segments = self._split_text(text, self.separators)
        chunks: list[RAGChunk] = []
        search_start = 0
        for segment in segments:
            found = text.find(segment, search_start)
            if found != -1:
                start_i, end_i = found, found + len(segment)
                search_start = end_i
            else:
                start_i, end_i = 0, 0
            chunks.append(RAGChunk(
                content=segment,
                content_without_overlap=segment,
                chunk_id=str(uuid.uuid4()),
                document_id=document_id,
                start_i=start_i,
                end_i=end_i,
            ))
        return chunks

    def _split_text(self, text: str, separators: List[str]) -> List[str]:
        separator = separators[-1]
        for s in separators:
            if s == "":
                separator = s
                break
            if s in text:
                separator = s
                break

        splits = text.split(separator) if separator else list(text)

        good_splits = []
        for s in splits:
            good_splits.append(s + separator if separator else s)

        final_chunks: list[str] = []
        current = ""
        for s in good_splits:
            if len(current) + len(s) <= self.chunk_size:
                current += s
            else:
                if current:
                    final_chunks.append(current.strip())
                if len(s) > self.chunk_size and len(separators) > 1:
                    final_chunks.extend(self._split_text(s, separators[1:]))
                    current = ""
                elif len(s) > self.chunk_size:
                    for i in range(0, len(s), self.chunk_size):
                        final_chunks.append(s[i : i + self.chunk_size].strip())
                    current = ""
                else:
                    current = s

        if current:
            final_chunks.append(current.strip())
        return [c for c in final_chunks if c]
