from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field

DEFAULT_PROMPT_TEMPLATE = (
    "You are an assistant that answers using the provided context.\n\n"
    "Context:\n{{context}}\n\n"
    "Question:\n{{question}}\n\n"
    "Answer:"
)


class WorkspaceCreate(BaseModel):
    id: str
    name: str
    description: str | None = None


class WorkspaceSummary(BaseModel):
    id: str
    organization_id: str
    project_id: str
    name: str
    description: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RetrievalConfig(BaseModel):
    top_k: int = 3
    score_threshold: float = 0.0
    hybrid_search: bool = True
    reranker_model: str = "cross-encoder-mini"
    chunk_size: int = 512
    chunk_overlap: int = 64


class VectorStoreConfig(BaseModel):
    collection_name: str | None = None
    distance_metric: str = "cosine"
    index_type: str = "hnsw"


class ReadingConfig(BaseModel):
    max_context_tokens: int = 4000
    context_compression: bool = False
    citation_mode: str = "inline"
    context_formatting_template: str = "[{index}] {text}"


class LlmConfig(BaseModel):
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    temperature: float = 0.2
    max_tokens: int = 700
    streaming: bool = False


class WorkspaceRagConfigUpdate(BaseModel):
    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimension: int | None = 1536
    embedding_batch_size: int = 16
    vector_store_type: str = "qdrant"
    vector_store_config: VectorStoreConfig = Field(default_factory=VectorStoreConfig)
    retrieval_config: RetrievalConfig = Field(default_factory=RetrievalConfig)
    reading_config: ReadingConfig = Field(default_factory=ReadingConfig)
    llm_config: LlmConfig = Field(default_factory=LlmConfig)
    prompt_template: str = DEFAULT_PROMPT_TEMPLATE


class WorkspaceRagConfig(WorkspaceRagConfigUpdate):
    workspace_id: str
    organization_id: str
    project_id: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


def build_default_workspace_rag_config(
    *, workspace_id: str, organization_id: str, project_id: str
) -> WorkspaceRagConfig:
    return WorkspaceRagConfig(
        workspace_id=workspace_id,
        organization_id=organization_id,
        project_id=project_id,
    )
