"""Pipeline-internal data models for the RAG pipeline.

These types are NEVER exposed outside the ``app.core.rag`` module.
External callers (KaragManager, API layer) interact only with the public
types defined in ``schemas.py`` (``Document``, ``FileConfig``, ``RagContext``,
etc.).

Pipeline data flow:
    Document → RAGDocument (chunks=[])
            → Chunker populates RAGDocument.chunks with RAGChunk instances
            → Embedder populates RAGChunk.embedded_contexts
            → VectorStore receives chunks and owns extraction/storage
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class RAGChunk:
    """Pipeline-internal chunk produced by a chunker.

    ``embedded_contexts`` is an opaque list populated by embedder components.
    Managers MUST NOT inspect, branch on, or assume any structure within it.
    Only vectorstore components may read ``embedded_contexts`` to persist data.
    """

    chunk_id: str
    document_id: str
    content: str
    content_without_overlap: str = ""
    start_i: int = 0
    end_i: int = 0
    title: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    embedded_contexts: list[Any] = field(default_factory=list)


@dataclass
class RAGDocument:
    """Pipeline-internal document representation.

    Created by ``RagManager._to_rag_document`` from an external ``Document``.
    Chunkers populate ``chunks``; embedders enrich each chunk's
    ``embedded_contexts``.  The document carries chunks through the pipeline.
    """

    document_id: str
    workspace_id: str
    content: str
    title: str = ""
    source: str = ""
    labels: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    chunks: list[RAGChunk] = field(default_factory=list)
