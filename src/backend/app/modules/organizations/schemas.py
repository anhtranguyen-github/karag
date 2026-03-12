from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel, Field


class DocumentStorageConfig(BaseModel):
    provider: str
    endpoint: str | None = None
    access_key: str | None = None
    secret_key: str | None = None
    bucket: str
    secure: bool


class OrganizationCreate(BaseModel):
    id: str | None = None
    name: str
    description: str | None = None


class OrganizationSummary(BaseModel):
    id: str
    name: str
    description: str | None = None
    status: str
    created_at: datetime


class OrganizationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


class ProjectCreate(BaseModel):
    id: str | None = None
    name: str
    description: str | None = None
    document_storage_config: DocumentStorageConfig | None = None


class ProjectSummary(BaseModel):
    id: str
    organization_id: str
    name: str
    description: str | None = None
    status: str
    document_storage_config: DocumentStorageConfig
    created_at: datetime


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    document_storage_config: DocumentStorageConfig | None = None
