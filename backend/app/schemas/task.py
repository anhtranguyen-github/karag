from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TaskMetadata(BaseModel):
    """Flexible metadata for different task types."""

    filename: str | None = None
    workspace_id: str | None = None
    doc_id: str | None = None
    operation: str | None = None
    url: str | None = None
    sitemap_url: str | None = None
    repo_url: str | None = None
    branch: str | None = None

    model_config = {"extra": "allow"}


class Task(BaseModel):
    id: str = Field(..., description="Unique task ID")
    type: str = Field(..., description="Task type (e.g., ingestion, indexing)")
    status: str = Field(..., description="Current status (pending, processing, completed, failed, canceled)")
    progress: int = Field(0, ge=0, le=100, description="Task progress percentage")
    message: str | None = Field(None, description="Human-readable status message")
    error: str | None = Field(None, description="Error message if task failed")
    workspace_id: str | None = Field(None, description="Workspace this task belongs to")
    metadata: TaskMetadata = Field(default_factory=TaskMetadata)
    result: dict[str, Any] | None = Field(None, description="Final task result")
    created_at: str | None = None
    updated_at: str | None = None


class TaskResponse(Task):
    """Standard task response."""

    pass


class TaskList(BaseModel):
    tasks: list[Task]
    total: int
