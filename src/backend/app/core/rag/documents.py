"""Domain objects for documents and chunks.

These types carry data through the public-facing layer of the RAG subsystem.
They may have factory functions or helper methods.

For pipeline-internal representations, see ``pipeline_models.py``.
"""

from __future__ import annotations

from typing import Any
from dataclasses import dataclass, field

from app.core.rag.types import FileStatus


# ── Chunk ────────────────────────────────────────────────


@dataclass
class Chunk:
    """Public chunk representation for API responses."""

    content: str = ""
    content_without_overlap: str = ""
    chunk_id: str = ""
    file_id: str = ""
    start_i: int = 0
    end_i: int = 0
    title: str = ""
    vector: list[float] | None = None
    labels: list[str] = field(default_factory=list)


# ── Document ─────────────────────────────────────────────


@dataclass
class Document:
    """Public document representation.

    Created by readers via ``create_document()`` and returned to callers.
    The pipeline-internal counterpart is ``RAGDocument`` (pipeline_models.py).
    """

    title: str = ""
    content: str = ""
    extension: str = ""
    file_size: int = 0
    labels: list[str] = field(default_factory=list)
    source: str = ""
    meta: dict[str, Any] = field(default_factory=dict)
    """Structured metadata populated at runtime (e.g. reader stats)."""
    metadata: str = ""
    """Raw metadata string carried over from ``FileConfig.metadata``."""
    file_id: str = ""
    chunks: list[Chunk] = field(default_factory=list)


# ── Factory ──────────────────────────────────────────────


def create_document(content: str, file_config: Any) -> Document:
    """Create a Document from extracted content and its FileConfig."""
    return Document(
        title=file_config.filename,
        content=content,
        extension=file_config.extension,
        labels=list(file_config.labels),
        source=file_config.source,
        file_size=file_config.file_size,
        metadata=file_config.metadata,
        file_id=file_config.file_id,
    )
