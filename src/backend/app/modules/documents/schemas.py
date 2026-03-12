from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel
from typing import Any

class DocumentBase(BaseModel):
    title: str
    extension: str
    file_size: int
    labels: list[str] = []
    source: str = ""
    metadata: dict[str, Any] = {}

class DocumentCreate(DocumentBase):
    project_id: str
    organization_id: str
    storage_path: str
    status: str = "uploaded"


class IngestionJobSummary(BaseModel):
    job_id: str
    document_id: str
    workspace_id: str
    track_id: str
    status: str
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None

class DocumentSummary(DocumentBase):
    id: str
    project_id: str
    organization_id: str
    storage_path: str
    status: str
    created_at: datetime
    workspace_count: int = 0
    latest_ingestion: IngestionJobSummary | None = None


class WorkspaceDocumentSummary(DocumentSummary):
    rag_status: str = "not_started"
    rag_progress: int | None = None
    rag_error: str | None = None
    rag_chunk_count: int | None = None


class IngestionTrackerSummary(IngestionJobSummary):
    pass


class DocumentIngestionResponse(BaseModel):
    document: DocumentSummary
    ingestion: IngestionTrackerSummary | None = None


class BulkIngestionResponse(BaseModel):
    status: str
    ingestions: list[IngestionTrackerSummary]
