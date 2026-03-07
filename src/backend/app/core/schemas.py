from typing import Any, Literal

from src.backend.app.schemas.chunking import ChunkingConfig, RecursiveChunkingConfig
from src.backend.app.schemas.embedding import (
    EmbeddingConfig,
)
from src.backend.app.schemas.execution import RuntimeSettings
from src.backend.app.schemas.generation import (
    GenerationConfig,
    OpenAIGenerationConfig,
)
from src.backend.app.schemas.retrieval import RetrievalConfig
from pydantic import BaseModel, Field, model_validator


class AppSettings(BaseModel):
    @classmethod
    def _expand_flat_dict(cls, flat_dict: dict[str, Any]) -> dict[str, Any]:
        """Convert a flat dict with dot-notation keys to a nested dict."""
        nested = {}
        for key, value in flat_dict.items():
            parts = key.split(".")
            d = nested
            for part in parts[:-1]:
                if part not in d or not isinstance(d[part], dict):
                    d[part] = {}
                d = d[part]
            d[parts[-1]] = value
        return nested

    @model_validator(mode="before")
    @classmethod
    def map_flat_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        # First expand any dot-notation fields
        data = cls._expand_flat_dict(data)
        
        # We now expect a structured dict, but we'll still do basic initialization if nodes are missing or empty
        # Pydantic unions with discriminators fail on empty dicts.
        if not data.get("embedding"):
            data["embedding"] = {}
        if not data.get("generation"):
            data["generation"] = {"provider": "openai"}
        if not data.get("chunking"):
            data["chunking"] = {"strategy": "recursive"}
        if not data.get("retrieval"):
            data["retrieval"] = {}
            
        return data

    # --- 1. Embedding Node (Immutable) ---
    embedding: EmbeddingConfig = Field(
        default_factory=lambda: EmbeddingConfig(),
        description="Embedding model configuration",
        json_schema_extra={"mutable": False, "category": "Embedding Component"},
    )
    distance_metric: Literal["cosine", "dot", "l2"] = Field(
        default="cosine",
        description="Vector similarity distance metric",
        json_schema_extra={"mutable": False, "category": "Embedding Component"},
    )
    embedding_normalization: bool = Field(
        default=True,
        description="Normalize embedding vectors before storage",
        json_schema_extra={"mutable": False, "category": "Embedding Component"},
    )

    # --- 2. Retrieval Node (Mutable) ---
    rag_engine: Literal["basic", "graph"] = Field(
        default="basic",
        description="Core RAG engine strategy",
        json_schema_extra={"mutable": True, "category": "Retrieval Component"},
    )
    retrieval: RetrievalConfig = Field(
        default_factory=RetrievalConfig,
        description="Modular retrieval pipeline configuration",
        json_schema_extra={"mutable": True, "category": "Retrieval Component"},
    )

    # --- 3. Generation Node (Mutable) ---
    generation: GenerationConfig = Field(
        default_factory=OpenAIGenerationConfig,
        description="LLM / VLM generation configuration",
        json_schema_extra={"mutable": True, "category": "Generation Component"},
    )
    system_prompt: str = Field(
        default="You are an advanced reasoning assistant. Use the provided context to answer the user's question.",
        description="System prompt for generation",
        json_schema_extra={"mutable": True, "category": "Generation Component"},
    )

    # --- 4. Agentic Node (Mutable) ---
    agentic_enabled: bool = Field(
        default=True,
        description="Enable agentic reasoning loop",
        json_schema_extra={"mutable": True, "category": "Agentic Component"},
    )
    agent_max_iterations: int = Field(
        default=5,
        ge=1,
        le=15,
        description="Max agent reasoning iterations",
        json_schema_extra={"mutable": True, "category": "Agentic Component"},
    )

    # --- 5. Ingestion & Job Node (Immutable strategy) ---
    chunking_strategy: Literal["recursive", "sentence", "token", "semantic", "fixed", "document"] = Field(
        default="recursive",
        description="Text splitting strategy",
        json_schema_extra={"mutable": False, "category": "Ingestion Component"},
    )
    chunking: ChunkingConfig = Field(
        default_factory=RecursiveChunkingConfig,
        description="Text splitting configuration",
        json_schema_extra={"mutable": False, "category": "Ingestion Component"},
    )

    # --- 6. Runtime & Execution (Dynamic strategy) ---
    runtime: RuntimeSettings = Field(
        default_factory=lambda: RuntimeSettings(),
        description="Default runtime execution and tracing configuration",
        json_schema_extra={"mutable": True, "category": "Execution Mode"},
    )

    @model_validator(mode="after")
    def sync_strategy_fields(self) -> "AppSettings":
        """Sync high-level strategies with nested configs."""
        # Sync RAG Engine
        self.retrieval.graph.enabled = self.rag_engine == "graph"
        
        self.show_reasoning = self.runtime.stream_thoughts
        return self

    job_concurrency: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Parallel ingestion jobs",
        json_schema_extra={"mutable": True, "category": "Ingestion Component"},
    )

    # --- 6. UI / System Configuration ---
    show_reasoning: bool = Field(
        default=True,
        description="Show reasoning steps in chat",
        json_schema_extra={"mutable": True, "category": "Interface"},
    )

    # Neo4j Graph Settings (Backend managed)
    neo4j_uri: str | None = Field(default=None)
    neo4j_user: str | None = Field(default=None)
    neo4j_password: str | None = Field(default=None)

    # Neo4j Graph Settings (Backend managed)
    neo4j_uri: str | None = Field(default=None)
    neo4j_user: str | None = Field(default=None)
    neo4j_password: str | None = Field(default=None)


class DocumentMetadata(BaseModel):
    id: str
    workspace_id: str
    filename: str
    extension: str
    minio_path: str
    status: Literal[
        "verifying",
        "verified",
        "reading",
        "uploaded",
        "embedding",
        "ingesting",
        "ingested",
        "failed",
    ] = "uploaded"
    workspace_statuses: dict[str, str] = Field(default_factory=dict)
    current_version: int = 1
    content_hash: str
    chunks: int = 0
    size_bytes: int = 0
    created_at: str
    updated_at: str
    shared_with: list[str] = []

