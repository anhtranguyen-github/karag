from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal, Any, Dict
from backend.app.schemas.chunking import ChunkingConfig, RecursiveChunkingConfig
from backend.app.schemas.embedding import EmbeddingConfig, OpenAIEmbeddingConfig, HuggingFaceEmbeddingConfig, OllamaEmbeddingConfig
from backend.app.schemas.generation import GenerationConfig, OpenAIGenerationConfig, LlamaGenerationConfig, VLMGenerationConfig
from backend.app.schemas.retrieval import RetrievalConfig
from backend.app.schemas.execution import RuntimeSettings, FastModeConfig

class AppSettings(BaseModel):
    @classmethod
    def _expand_flat_dict(cls, flat_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a flat dict with dot-notation keys to a nested dict."""
        nested = {}
        for key, value in flat_dict.items():
            parts = key.split('.')
            d = nested
            for part in parts[:-1]:
                if part not in d or not isinstance(d[part], dict):
                    d[part] = {}
                d = d[part]
            d[parts[-1]] = value
        return nested

    @model_validator(mode='before')
    @classmethod
    def map_flat_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
            
        # First expand any dot-notation fields
        data = cls._expand_flat_dict(data)

        # 1. Embedding legacy mapping
        if "embedding_provider" in data or "embedding_model" in data or "embedding_dim" in data:
            emb_payload = {}
            provider = data.get("embedding_provider", "openai")
            emb_payload["provider"] = provider
            if "embedding_model" in data:
                emb_payload["model"] = data["embedding_model"]
            
            # Map specific configs if needed
            if "embedding" not in data:
                if provider == "openai":
                    data["embedding"] = OpenAIEmbeddingConfig(**emb_payload)
                elif provider == "local" or provider == "huggingface":
                    emb_payload["provider"] = "huggingface"
                    data["embedding"] = HuggingFaceEmbeddingConfig(**emb_payload)
                elif provider == "ollama":
                    data["embedding"] = OllamaEmbeddingConfig(**emb_payload)
        
        # 2. Retrieval
        if "retrieval" not in data:
            data["retrieval"] = RetrievalConfig()
            
        retrieval = data["retrieval"]
        if isinstance(retrieval, dict):
            if "rag_engine" in data:
                rag_engine = data["rag_engine"]
                retrieval.setdefault("graph", {})["enabled"] = (rag_engine == "graph")
            if "graph_enabled" in data:
                retrieval.setdefault("graph", {})["enabled"] = data["graph_enabled"]
            if "reranker_enabled" in data:
                retrieval.setdefault("rerank", {})["enabled"] = data["reranker_enabled"]
            
            if "reranker_provider" in data:
                prov = data["reranker_provider"]
                if prov and prov.lower() != "none" and prov in ["cohere", "openai", "local"]:
                    retrieval.setdefault("rerank", {})["provider"] = prov
                else:
                    # If provider is 'none' but enabled is true, default to local
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
                retrieval.setdefault("hybrid", {})["enabled"] = True
        
        # 3. Generation
        if "llm_provider" in data or "llm_model" in data or "temperature" in data:
            gen_payload = {}
            provider = data.get("llm_provider", "openai")
            gen_payload["provider"] = provider
            if "llm_model" in data:
                gen_payload["model"] = data["llm_model"]
            if "temperature" in data:
                gen_payload["temperature"] = data["temperature"]
            
            if "generation" not in data:
                if provider == "openai":
                    data["generation"] = OpenAIGenerationConfig(**gen_payload)
                elif provider == "local" or provider == "llama":
                    gen_payload["provider"] = "llama"
                    data["generation"] = LlamaGenerationConfig(**gen_payload)
        
        # 4. Chunking
        if "chunk_size" in data or "chunk_overlap" in data:
            chunk_payload = {}
            if "chunk_size" in data:
                # max_chunk_size is used in Recursive, chunk_size in Fixed
                chunk_payload["max_chunk_size"] = data["chunk_size"]
                chunk_payload["chunk_size"] = data["chunk_size"]
            if "chunk_overlap" in data:
                chunk_payload["chunk_overlap"] = data["chunk_overlap"]
            
            if "chunking" not in data:
                # Use strategy as discriminator for Annotated Union
                strategy = data.get("chunking_strategy", "recursive")
                chunk_payload["strategy"] = strategy
                data["chunking"] = chunk_payload

        return data

    # --- 1. Embedding Node (Immutable) ---
    embedding: EmbeddingConfig = Field(
        default_factory=lambda: OpenAIEmbeddingConfig(),
        description="Embedding model configuration",
        json_schema_extra={"mutable": False, "category": "Embedding Component"}
    )
    distance_metric: Literal["cosine", "dot", "l2"] = Field(
        default="cosine",
        description="Vector similarity distance metric",
        json_schema_extra={"mutable": False, "category": "Embedding Component"}
    )
    embedding_normalization: bool = Field(
        default=True,
        description="Normalize embedding vectors before storage",
        json_schema_extra={"mutable": False, "category": "Embedding Component"}
    )

    # --- 2. Retrieval Node (Mutable) ---
    rag_engine: Literal["basic", "graph"] = Field(
        default="basic",
        description="Core RAG engine strategy",
        json_schema_extra={"mutable": True, "category": "Retrieval Component"}
    )
    retrieval: RetrievalConfig = Field(
        default_factory=RetrievalConfig,
        description="Modular retrieval pipeline configuration",
        json_schema_extra={"mutable": True, "category": "Retrieval Component"}
    )

    # --- 3. Generation Node (Mutable) ---
    generation: GenerationConfig = Field(
        default_factory=lambda: OpenAIGenerationConfig(),
        description="LLM / VLM generation configuration",
        json_schema_extra={"mutable": True, "category": "Generation Component"}
    )
    system_prompt: str = Field(
        default="You are an advanced reasoning assistant. Use the provided context to answer the user's question.",
        description="System prompt for generation",
        json_schema_extra={"mutable": True, "category": "Generation Component"}
    )

    # --- 4. Agentic Node (Mutable) ---
    agentic_enabled: bool = Field(
        default=True,
        description="Enable agentic reasoning loop",
        json_schema_extra={"mutable": True, "category": "Agentic Component"}
    )
    agent_max_iterations: int = Field(
        default=5, ge=1, le=15,
        description="Max agent reasoning iterations",
        json_schema_extra={"mutable": True, "category": "Agentic Component"}
    )

    # --- 5. Ingestion & Job Node (Immutable strategy) ---
    chunking_strategy: Literal["recursive", "sentence", "token", "semantic", "fixed", "document"] = Field(
        default="recursive",
        description="Text splitting strategy",
        json_schema_extra={"mutable": False, "category": "Ingestion Component"}
    )
    chunking: ChunkingConfig = Field(
        default_factory=lambda: RecursiveChunkingConfig(),
        description="Text splitting configuration",
        json_schema_extra={"mutable": False, "category": "Ingestion Component"}
    )

    # --- 6. Runtime & Execution (Dynamic strategy) ---
    runtime: RuntimeSettings = Field(
        default_factory=lambda: RuntimeSettings(),
        description="Default runtime execution and tracing configuration",
        json_schema_extra={"mutable": True, "category": "Execution Mode"}
    )
    
    @model_validator(mode='after')
    def sync_strategy_fields(self) -> 'AppSettings':
        """Sync high-level strategies with nested configs."""
        # Sync RAG Engine
        self.retrieval.graph.enabled = (self.rag_engine == "graph")
        
        # Sync Chunking Strategy
        if hasattr(self.chunking, "strategy") and self.chunking.strategy != self.chunking_strategy:
            # We need to re-initialize chunking based on strategy if it changed
            # This is handled mostly during initial creation via map_flat_fields
            pass
        return self

    job_concurrency: int = Field(
        default=3, ge=1, le=10,
        description="Parallel ingestion jobs",
        json_schema_extra={"mutable": True, "category": "Ingestion Component"}
    )

    # --- 6. UI / System Configuration ---
    show_reasoning: bool = Field(
        default=True, 
        description="Show reasoning steps in chat",
        json_schema_extra={"mutable": True, "category": "Interface"}
    )
    
    # Neo4j Graph Settings (Backend managed)
    neo4j_uri: Optional[str] = Field(default=None)
    neo4j_user: Optional[str] = Field(default=None)
    neo4j_password: Optional[str] = Field(default=None)

    # --- Compatibility Proxies (for legacy / flat access) ---
    @property
    def embedding_provider(self) -> str:
        return self.embedding.provider

    @property
    def embedding_model(self) -> str:
        return self.embedding.model

    @property
    def embedding_dim(self) -> int:
        return self.embedding.dimensions

    @property
    def llm_provider(self) -> str:
        return self.generation.provider

    @property
    def llm_model(self) -> str:
        return self.generation.model


    @property
    def chunk_size(self) -> int:
        return self.chunking.max_chunk_size if hasattr(self.chunking, "max_chunk_size") else 800

    @property
    def chunk_overlap(self) -> int:
        return self.chunking.chunk_overlap if hasattr(self.chunking, "chunk_overlap") else 150

    @property
    def search_limit(self) -> int:
        return self.retrieval.vector.top_k

    @property
    def reranker_enabled(self) -> bool:
        return self.retrieval.rerank.enabled

    @property
    def rerank_top_k(self) -> int:
        return self.retrieval.rerank.top_n

    def get_rag_hash(self) -> str:
        """Generate a hash based on core RAG parameters affecting state."""
        import hashlib
        config_str = (
            f"{self.embedding.provider}|"
            f"{self.embedding.model}|"
            f"{self.embedding.dimensions}|"
            f"{self.chunking.strategy}|"
            f"{self.generation.provider}|"
            f"{self.generation.model}|"
            f"{self.retrieval.vector.enabled}"
        )
        return hashlib.sha256(config_str.encode()).hexdigest()[:12]

class DocumentMetadata(BaseModel):
    id: str
    workspace_id: str
    filename: str
    extension: str
    minio_path: str
    status: Literal["verifying", "verified", "reading", "uploaded", "embedding", "ingesting", "ingested", "failed"] = "uploaded"
    workspace_statuses: Dict[str, str] = Field(default_factory=dict)
    current_version: int = 1
    content_hash: str
    chunks: int = 0
    size_bytes: int = 0
    created_at: str
    updated_at: str
    shared_with: list[str] = []
