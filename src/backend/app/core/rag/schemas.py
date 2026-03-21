"""Pydantic schemas (I/O validation) for the RAG subsystem.

Lightweight data contracts live in ``types.py``.
Domain objects (Chunk, Document) live in ``documents.py``.
Pipeline-internal types live in ``pipeline_models.py``.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.core.rag.types import FileStatus

# Re-export everything so existing ``from app.core.rag.schemas import X`` still works.
from app.core.rag.types import (  # noqa: F401
    EMBEDDING_TYPES,
    ChatCompletion,
    ChatMessage,
    Embedding,
    FileStatus,
    RagContext,
    RagExecutionResult,
    RerankResult,
    RetrievedChunk,
)
from app.core.rag.documents import Chunk, Document, create_document  # noqa: F401


# ── File config (Pydantic I/O schema) ───────────────────


class FileConfig(BaseModel):
    file_id: str = Field(..., alias="fileID")
    filename: str
    is_url: bool = Field(..., alias="isURL")
    overwrite: bool
    extension: str
    source: str
    content: Any
    labels: list[str]
    rag_config: dict[str, Any]
    file_size: int
    status: FileStatus
    metadata: str
    status_report: dict[str, Any]

    model_config = ConfigDict(populate_by_name=True)