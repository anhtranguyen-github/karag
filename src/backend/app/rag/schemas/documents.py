from __future__ import annotations

from typing import Any, List, Dict
from pydantic import BaseModel, Field

class Document(BaseModel):
    """Temporary in-memory object (output of a reader)."""
    file_id: str
    content: str
    title: str
    source: str
    labels: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict) # e.g. extension, file_size

class Chunk(BaseModel):
    """Temporary in-memory chunk."""
    chunk_id: str
    document_id: str
    text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
