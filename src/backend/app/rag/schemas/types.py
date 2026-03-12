from __future__ import annotations

from enum import Enum
from typing import Any, List, Dict, Optional
from pydantic import BaseModel, Field, ConfigDict

class FileStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

EMBEDDING_TYPES = ["dense", "hybrid", "graph"]

class Embedding(BaseModel):
    vector: List[float]
    embedding_type: str = "dense"
    metadata: Dict[str, Any] = Field(default_factory=dict)

class PIISpan(BaseModel):
    start: int
    end: int
    entity_type: str
    text: str
    redacted_text: str


class RerankResult(BaseModel):
    chunk: RetrievedChunk
    score: float

class ChatCompletion(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, Any]

class RetrievedChunk(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    text: str
    score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RagContext(BaseModel):
    organization_id: str
    project_id: str
    workspace_id: str
    collection_name: str
    filters: Dict[str, str] = Field(default_factory=dict)
    top_k: int = 5

class RagExecutionResult(BaseModel):
    answer: str
    prompt: str
    transformed_query: str
    chunks: List[RetrievedChunk]
    trace: List[str] = Field(default_factory=list)

class ChatMessage(BaseModel):
    role: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
