from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class KnowledgeDatasetCreate(BaseModel):
    workspace_id: str
    name: str
    description: str | None = None
    embedding_model: str = "nomic-embed-text"
    chunk_strategy: str = "word-window"


class KnowledgeDatasetSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    organization_id: str
    project_id: str
    workspace_id: str
    name: str
    description: str | None = None
    embedding_model: str
    chunk_strategy: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class KnowledgeDatasetDetail(KnowledgeDatasetSummary):
    document_count: int = 0
    chunk_count: int = 0


class DocumentSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    dataset_id: str
    organization_id: str
    project_id: str
    workspace_id: str
    title: str
    storage_path: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ChunkSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    document_id: str
    dataset_id: str
    organization_id: str
    project_id: str
    workspace_id: str
    text: str
    token_count: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DocumentUploadResponse(BaseModel):
    document: DocumentSummary
    chunks_created: int
    events: list[str]
