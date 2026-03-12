from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

from app.rag.schemas.types import FileStatus

# ── File config (Storage Metadata) ───────────────────

class FileConfig(BaseModel):
    """Metadata representing a stored file (MinIO/S3).
    This object is persisted in the DB as the primary storage reference.
    NO file content, NO embeddings.
    """
    file_id: str = Field(..., alias="fileID")
    storage_path: str
    project_id: str
    organization_id: str
    filename: str
    extension: str
    file_size: int
    mime_type: str = "application/octet-stream"
    source: str # e.g. "upload", "googledrive"
    status: FileStatus
    status_report: Dict[str, Any] = Field(default_factory=dict)
    labels_json: List[str] = Field(default_factory=list)
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

# ── Re-exports for compatibility ──────────────────────
# Using direct imports from new schema locations

from app.rag.schemas.types import ( # noqa: F401
    EMBEDDING_TYPES,
    ChatCompletion,
    ChatMessage,
    Embedding,
    RagContext,
    RagExecutionResult,
    RerankResult,
    RetrievedChunk,
)
from app.rag.schemas.documents import Document, Chunk # noqa: F401
from app.rag.schemas.pipeline_models import RAGChunk, RAGDocument # noqa: F401