from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class KnowledgeDatasetCreate(BaseModel):
    workspace_id: str
    name: str
    description: str | None = None
    embedding_model: str = "text-embedding-3-small"
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
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    dataset_id: str | None = None
    organization_id: str
    project_id: str
    workspace_id: str | None = None
    title: str
    storage_path: str
    metadata: dict[str, Any] = Field(default_factory=dict, alias="metadata_json")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChunkSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    document_id: str
    dataset_id: str | None = None
    organization_id: str
    project_id: str
    workspace_id: str | None = None
    text: str
    token_count: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DocumentUploadResponse(BaseModel):
    document: DocumentSummary
    chunks_created: int
    events: list[str]
