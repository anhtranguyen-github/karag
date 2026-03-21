from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Any

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

class DocumentSummary(DocumentBase):
    id: str
    project_id: str
    organization_id: str
    status: str
    created_at: datetime
