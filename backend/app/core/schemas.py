from pydantic import BaseModel, Field, model_validator, computed_field
from typing import Optional, Literal, Any, Dict
from backend.app.schemas.chunking import ChunkingConfig, RecursiveChunkingConfig
from backend.app.schemas.embedding import (
    EmbeddingConfig,
    OpenAIEmbeddingConfig,
    HuggingFaceEmbeddingConfig,
    OllamaEmbeddingConfig,
    SparseEmbeddingConfig,
)
from backend.app.schemas.generation import (
    GenerationConfig,
    OpenAIGenerationConfig,
    LlamaGenerationConfig,
)
from backend.app.schemas.retrieval import RetrievalConfig
from backend.app.schemas.execution import RuntimeSettings


class AppSettings(BaseModel):
    @classmethod
    def _expand_flat_dict(cls, flat_dict: Dict[str, Any]) -> Dict[str, Any]:
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

        # 1. Embedding mapping
        if (
            "embedding_provider" in data
            or "embedding_model" in data
            or "embedding_dim" in data
        ):
            # If embedding exists as a dict, we update it; if it's an object, we start fresh from flat fields
            provider = data.get("embedding_provider", "openai")
            model = data.get("embedding_model")
            
            dense_payload = {}
            sparse_payload = {}
            
            if isinstance(data.get("embedding"), dict):
                dense_payload.update(data["embedding"].get("dense", {}))
                sparse_payload.update(data["embedding"].get("sparse", {}))
            
            dense_payload["provider"] = provider
            if model:
                dense_payload["model"] = model

            embedding_obj = {}
            if provider == "openai":
                embedding_obj["dense"] = OpenAIEmbeddingConfig(**dense_payload)
            elif provider == "local" or provider == "huggingface":
                dense_payload["provider"] = "huggingface"
                embedding_obj["dense"] = HuggingFaceEmbeddingConfig(**dense_payload)
            elif provider == "ollama":
                embedding_obj["dense"] = OllamaEmbeddingConfig(**dense_payload)
            else:
                # Fallback for other providers if already in dense_payload
                embedding_obj["dense"] = dense_payload
            
            embedding_obj["sparse"] = SparseEmbeddingConfig(**sparse_payload)
            data["embedding"] = embedding_obj

        # 3. Generation
        if "llm_provider" in data or "llm_model" in data or "temperature" in data:
            provider = data.get("llm_provider", "openai")
            model = data.get("llm_model")
            temp = data.get("temperature")
            
            gen_payload = {}
            if isinstance(data.get("generation"), dict):
                gen_payload.update(data["generation"])
                
            gen_payload["provider"] = provider
            if model:
                gen_payload["model"] = model
            if temp is not None:
                gen_payload["temperature"] = temp

            if provider == "openai":
                data["generation"] = OpenAIGenerationConfig(**gen_payload)
            elif provider == "local" or provider == "llama":
                gen_payload["provider"] = "llama"
                data["generation"] = LlamaGenerationConfig(**gen_payload)

        # 4. Chunking
        if "chunk_size" in data or "chunk_overlap" in data or "chunking_strategy" in data:
            strategy = data.get("chunking_strategy", "recursive")
            size = data.get("chunk_size")
            overlap = data.get("chunk_overlap")
            
            chunk_payload = {"strategy": strategy}
            if isinstance(data.get("chunking"), dict):
                chunk_payload.update(data["chunking"])
            
            if size is not None:
                chunk_payload["max_chunk_size"] = size
                chunk_payload["chunk_size"] = size
            if overlap is not None:
                chunk_payload["chunk_overlap"] = overlap
                
            data["chunking"] = chunk_payload

        # 2. Retrieval mapping
        if "retrieval" not in data:
            data["retrieval"] = RetrievalConfig()

        retrieval = data["retrieval"]
        if isinstance(retrieval, dict):
            if "rag_engine" in data:
                rag_engine = data["rag_engine"]
                retrieval.setdefault("graph", {})["enabled"] = rag_engine == "graph"
            if "graph_enabled" in data:
                retrieval.setdefault("graph", {})["enabled"] = data["graph_enabled"]
            if "reranker_enabled" in data:
                retrieval.setdefault("rerank", {})["enabled"] = data["reranker_enabled"]

            if "reranker_provider" in data:
                prov = data["reranker_provider"]
                if (
                    prov
                    and prov.lower() != "none"
                    and prov in ["cohere", "openai", "local"]
                ):
                    retrieval.setdefault("rerank", {})["provider"] = prov
                else:
                    if retrieval.get("rerank", {}).get("enabled"):
                        retrieval.setdefault("rerank", {})["provider"] = "local"

            if "rerank_top_k" in data:
                retrieval.setdefault("rerank", {})["top_n"] = data["rerank_top_k"]
            if "search_limit" in data:
                retrieval.setdefault("vector", {})["top_k"] = data["search_limit"]
            if "recall_k" in data:
                retrieval.setdefault("vector", {})["top_k"] = data["recall_k"]
            if "hybrid_alpha" in data:
                retrieval.setdefault("hybrid", {})["dense_weight"] = data["hybrid_alpha"]
                retrieval.setdefault("hybrid", {})["sparse_weight"] = 1.0 - data["hybrid_alpha"]
                retrieval.setdefault("hybrid", {})["enabled"] = True
                # Automatically enable sparse if hybrid is used with a weight
                if data["hybrid_alpha"] < 1.0:
                    retrieval.setdefault("sparse", {})["enabled"] = True
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
        default_factory=lambda: GenerationConfig(),
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
    chunking_strategy: Literal[
        "recursive", "sentence", "token", "semantic", "fixed", "document"
    ] = Field(
        default="recursive",
        description="Text splitting strategy",
        json_schema_extra={"mutable": False, "category": "Ingestion Component"},
    )
    chunking: ChunkingConfig = Field(
        default_factory=lambda: ChunkingConfig(strategy="recursive"),
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

        # Sync Retrieval fields
        self.retrieval.vector.top_k = self.search_limit
        self.retrieval.rerank.enabled = self.reranker_enabled
        self.retrieval.rerank.top_n = self.rerank_top_k

        # Sync Generation fields
        self.generation.provider = self.llm_provider
        self.generation.model = self.llm_model
        self.generation.temperature = self.temperature

        # Sync Runtime fields
        self.runtime.mode = self.runtime_mode
        self.runtime.stream_thoughts = self.runtime_stream_thoughts
        self.runtime.tracing.trace_level = self.runtime_trace_level
        self.show_reasoning = self.runtime_stream_thoughts

        # Sync Embedding fields
        self.embedding.dense.provider = self.embedding_provider
        self.embedding.dense.model = self.embedding_model

        # Sync Chunking Strategy
        if (
            hasattr(self.chunking, "strategy")
            and self.chunking.strategy != self.chunking_strategy
        ):
            # We need to re-initialize chunking based on strategy if it changed
            # This is handled mostly during initial creation via map_flat_fields
            pass
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
    neo4j_uri: Optional[str] = Field(default=None)
    neo4j_user: Optional[str] = Field(default=None)
    neo4j_password: Optional[str] = Field(default=None)

    # --- 7. Compatibility Fields (Promoted to real fields for metadata discovery) ---
    llm_provider: str = Field(
        default="openai",
        description="The AI service provider for chat.",
        json_schema_extra={"mutable": True, "category": "Generation Component"},
    )
    llm_model: str = Field(
        default="gpt-4o",
        description="The specific AI model to use.",
        json_schema_extra={"mutable": True, "category": "Generation Component"},
    )
    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Controls how creative or literal the responses are.",
        json_schema_extra={"mutable": True, "category": "Generation Component"},
    )
    search_limit: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Number of relevant documents to retrieve.",
        json_schema_extra={"mutable": True, "category": "Retrieval Component"},
    )
    reranker_enabled: bool = Field(
        default=False,
        description="Use a reranker to improve retrieval quality.",
        json_schema_extra={"mutable": True, "category": "Retrieval Component"},
    )
    rerank_top_k: int = Field(
        default=3,
        ge=1,
        le=20,
        description="Number of documents to keep after reranking.",
        json_schema_extra={"mutable": True, "category": "Retrieval Component"},
    )

    embedding_provider: str = Field(
        default="openai",
        description="The AI service provider for embeddings.",
        json_schema_extra={"mutable": False, "category": "Embedding Component"},
    )
    embedding_model: str = Field(
        default="text-embedding-3-small",
        description="The specific embedding model to use.",
        json_schema_extra={"mutable": False, "category": "Embedding Component"},
    )
    embedding_dim: int = Field(
        default=1536,
        description="The dimension of the embedding vectors.",
        json_schema_extra={"mutable": False, "category": "Embedding Component"},
    )

    runtime_mode: Literal["auto", "fast", "think", "deep"] = Field(
        default="auto",
        description="Response strategy: 'auto' (balanced), 'fast' (direct answer), 'think' (longer reasoning/planning), 'deep' (detailed research report).",
        json_schema_extra={
            "mutable": True,
            "category": "Execution Mode",
        },
    )

    runtime_stream_thoughts: bool = Field(
        default=True,
        description="Stream the agent's internal reasoning LIVE to the chat.",
        json_schema_extra={
            "mutable": True,
            "category": "Execution Mode",
        },
    )

    runtime_trace_level: Literal["basic", "detailed", "debug"] = Field(
        default="detailed",
        description="Depth of observability and logging for RAG operations.",
        json_schema_extra={
            "mutable": True,
            "category": "Execution Mode",
        },
    )

    @computed_field
    @property
    def chunk_size(self) -> int:
        return (
            self.chunking.max_chunk_size
            if hasattr(self.chunking, "max_chunk_size")
            else 800
        )

    @computed_field
    @property
    def chunk_overlap(self) -> int:
        return (
            self.chunking.chunk_overlap
            if hasattr(self.chunking, "chunk_overlap")
            else 150
        )


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
    workspace_statuses: Dict[str, str] = Field(default_factory=dict)
    current_version: int = 1
    content_hash: str
    chunks: int = 0
    size_bytes: int = 0
    created_at: str
    updated_at: str
    shared_with: list[str] = []
