from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator
from backend.app.schemas.chat import ThreadMetadata
from backend.app.schemas.documents import DocumentResponse


class WorkspaceStats(BaseModel):
    thread_count: int = 0
    doc_count: int = 0


class Workspace(BaseModel):
    id: str = Field(..., description="Short unique ID of the workspace")
    name: str = Field(..., description="Display name of the workspace")
    description: str | None = Field(None, description="Detailed description")
    created_at: str | None = None
    updated_at: str | None = None
    stats: WorkspaceStats | None = None


class WorkspaceDetail(Workspace):
    threads: list[ThreadMetadata] = []
    documents: list[DocumentResponse] = []
    settings: dict | None = None


class WorkspaceCreate(BaseModel):
    model_config = {"extra": "allow"}

    name: str = Field(..., min_length=1, max_length=50, pattern=r"^[\w\s.-]+$")
    description: str | None = Field(None, max_length=200)

    # Grouped Component configurations
    embedding: dict | None = Field(default_factory=dict)
    retrieval: dict | None = Field(default_factory=dict)
    generation: dict | None = Field(default_factory=dict)
    chunking: dict | None = Field(default_factory=dict)

    # Backend / System
    rag_engine: Literal["basic", "graph"] = Field(default="basic")
    neo4j_uri: str | None = None
    neo4j_user: str | None = None
    neo4j_password: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty or whitespace only")
        return v.strip()


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
