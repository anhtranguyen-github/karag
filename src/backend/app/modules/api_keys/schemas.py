from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class ApiKeySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    organization_id: str
    project_id: str
    name: str
    masked_key: str | None = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApiKeyCreate(BaseModel):
    name: str
    organization_id: str
    project_id: str


class ApiKeyCreated(ApiKeySummary):
    key_value: str
