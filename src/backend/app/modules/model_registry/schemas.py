from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class ModelCreate(BaseModel):
    name: str
    type: str
    framework: str
    description: str | None = None


class ModelSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    organization_id: str
    name: str
    type: str
    framework: str
    description: str | None = None
    lifecycle_state: str = "registered"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ModelVersionCreate(BaseModel):
    version: str
    release_notes: str | None = None


class ModelVersionSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    model_id: str
    organization_id: str
    version: str
    release_notes: str | None = None
    lifecycle_state: str = "validated"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ModelArtifactCreate(BaseModel):
    name: str
    artifact_type: str
    storage_backend: str = "minio"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ModelArtifactSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    model_version_id: str
    organization_id: str
    name: str
    artifact_type: str
    storage_backend: str
    storage_path: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ModelDeploymentCreate(BaseModel):
    workspace_id: str
    target: str
    inference_url: str
    configuration: dict[str, Any] = Field(default_factory=dict)


class ModelDeploymentSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    model_version_id: str
    organization_id: str
    project_id: str
    workspace_id: str
    target: str
    inference_url: str
    configuration: dict[str, Any] = Field(default_factory=dict)
    lifecycle_state: str = "deployed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
