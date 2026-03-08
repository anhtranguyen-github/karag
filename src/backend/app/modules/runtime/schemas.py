from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class EmbeddingRequest(BaseModel):
    input: list[str]
    provider: str | None = None
    model: str | None = None


class EmbeddingResponse(BaseModel):
    provider: str
    model: str
    data: list[list[float]]


class ChatCompletionRequest(BaseModel):
    messages: list[dict[str, str]]
    provider: str | None = None
    model: str | None = None
    workspace_id: str | None = None


class ChatCompletionResponse(BaseModel):
    provider: str
    model: str
    content: str
    usage: dict[str, int]


class RagQueryRequest(BaseModel):
    workspace_id: str
    knowledge_dataset_id: str
    query: str
    top_k: int | None = None
    llm_provider: str | None = None
    llm_model: str | None = None


class RagChunkResult(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    score: float
    text: str


class RagQueryResponse(BaseModel):
    answer: str
    provider: str
    model: str
    prompt: str
    chunks: list[RagChunkResult]
    usage: dict[str, int]


class RuntimeModelSummary(BaseModel):
    provider: str
    kind: str
    models: list[str]


class RuntimeDocumentSummary(BaseModel):
    id: str
    dataset_id: str
    title: str
    storage_path: str
    metadata: dict[str, Any] = Field(default_factory=dict)
