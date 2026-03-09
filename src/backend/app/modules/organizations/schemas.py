from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel, Field


class DocumentStorageConfig(BaseModel):
    provider: str = "minio"
    endpoint: str | None = None
    access_key: str | None = None
    secret_key: str | None = None
    bucket: str = "karag"
    secure: bool = False


class OrganizationCreate(BaseModel):
    id: str
    name: str
    description: str | None = None


class OrganizationSummary(BaseModel):
    id: str
    name: str
    description: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProjectCreate(BaseModel):
    id: str
    name: str
    description: str | None = None
    document_storage_config: DocumentStorageConfig = Field(default_factory=DocumentStorageConfig)


class ProjectSummary(BaseModel):
    id: str
    organization_id: str
    name: str
    description: str | None = None
    document_storage_config: DocumentStorageConfig = Field(default_factory=DocumentStorageConfig)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    document_storage_config: DocumentStorageConfig | None = None
