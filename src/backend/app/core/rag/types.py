"""Lightweight data contracts for the RAG subsystem.

These are simple, reusable type definitions with no business logic.
Used across layers (components, managers, API, workers).
"""

from __future__ import annotations

from enum import Enum
from typing import Any
from dataclasses import dataclass, field


# ── Chat primitives ──────────────────────────────────────


@dataclass(slots=True)
class ChatMessage:
    role: str
    content: str


@dataclass(slots=True)
class ChatCompletion:
    model: str
    content: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int


# ── Embedding & Vector primitives ────────────────────────


EMBEDDING_TYPES = ("dense", "sparse", "hybrid", "multi_vector", "graph")


@dataclass(slots=True)
class Embedding:
    vector: list[float]
    embedding_type: str
    raw_vectors: list[list[float]] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class RerankResult:
    index: int
    score: float
    text: str | None = None


# ── Status ───────────────────────────────────────────────


class FileStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ── Retrieval primitives ─────────────────────────────────


@dataclass(slots=True)
class RetrievedChunk:
    chunk_id: str
    document_id: str
    document_title: str
    text: str
    score: float
    metadata: dict[str, Any] = field(default_factory=dict)


# ── RAG execution context & result ───────────────────────


@dataclass(slots=True)
class RagContext:
    organization_id: str
    project_id: str
    workspace_id: str
    dataset_id: str
    collection_name: str
    filters: dict[str, str]
    top_k: int


@dataclass(slots=True)
class RagExecutionResult:
    answer: str
    prompt: str
    transformed_query: str
    chunks: list[RetrievedChunk]
