from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel, Field


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


class ProjectSummary(BaseModel):
    id: str
    organization_id: str
    name: str
    description: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
