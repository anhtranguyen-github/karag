from pydantic import BaseModel, Field
from typing import Optional, Literal

class AppSettings(BaseModel):
    # --- 1. Embedding Node (Immutable) ---
    embedding_provider: Literal["openai", "voyage", "local", "ollama", "vllm", "llama-cpp"] = Field(
        default="openai", 
        json_schema_extra={"mutable": False, "category": "Embedding Node"}
    )
    embedding_model: str = Field(
        default="text-embedding-3-small", 
        json_schema_extra={"mutable": False, "category": "Embedding Node"}
    )
    embedding_dim: int = Field(
        default=1536, 
        json_schema_extra={"mutable": False, "category": "Embedding Node"}
    )
    embedding_batch_size: int = Field(
        default=32,
        json_schema_extra={"mutable": True, "category": "Embedding Node"}
    )

    # --- 2. Retrieval Node (Mutable) ---
    rag_engine: Literal["basic", "graph"] = Field(
        default="basic", 
        json_schema_extra={"mutable": False, "category": "Retrieval Node"}
    )
    search_limit: int = Field(
        default=5, ge=1, le=50, 
        json_schema_extra={"mutable": True, "category": "Retrieval Node"}
    )
    recall_k: int = Field(
        default=20, ge=1, le=100,
        json_schema_extra={"mutable": True, "category": "Retrieval Node"}
    )
    hybrid_alpha: float = Field(
        default=0.5, ge=0.0, le=1.0, 
        json_schema_extra={"mutable": True, "category": "Retrieval Node"}
    )
    retrieval_timeout: int = Field(
        default=30000, # ms
        json_schema_extra={"mutable": True, "category": "Retrieval Node"}
    )

    # --- 3. Graph / Knowledge Node (Mutable toggles) ---
    graph_enabled: bool = Field(
        default=True,
        json_schema_extra={"mutable": True, "category": "Graph Node"}
    )
    graph_hops: int = Field(
        default=2, ge=1, le=5,
        json_schema_extra={"mutable": True, "category": "Graph Node"}
    )
    graph_subgraph_limit: int = Field(
        default=20,
        json_schema_extra={"mutable": True, "category": "Graph Node"}
    )

    # --- 4. Reranking Node (Mutable) ---
    reranker_enabled: bool = Field(
        default=False,
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )
    reranker_provider: Literal["none", "cohere", "jina", "local"] = Field(
        default="none",
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )
    rerank_top_k: int = Field(
        default=3, ge=1, le=15,
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )
    rerank_threshold: float = Field(
        default=0.0,
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )

    # --- 5. Agentic Node (Mutable) ---
    agentic_enabled: bool = Field(
        default=True,
        json_schema_extra={"mutable": True, "category": "Agentic Node"}
    )
    agent_max_iterations: int = Field(
        default=5, ge=1, le=15,
        json_schema_extra={"mutable": True, "category": "Agentic Node"}
    )
    agent_tool_limit: int = Field(
        default=10,
        json_schema_extra={"mutable": True, "category": "Agentic Node"}
    )
    agent_memory_scope: Literal["none", "session", "workspace"] = Field(
        default="session",
        json_schema_extra={"mutable": True, "category": "Agentic Node"}
    )

    # --- 6. Generation Node (Mutable) ---
    llm_provider: Literal["openai", "anthropic", "ollama", "vllm", "llama-cpp"] = Field(
        default="openai", 
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )
    llm_model: str = Field(
        default="gpt-4o", 
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )
    temperature: float = Field(
        default=0.7, ge=0.0, le=2.0,
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )
    max_tokens: int = Field(
        default=2048,
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )
    system_prompt: str = Field(
        default="You are an advanced reasoning assistant. Use the provided context to answer the user's question.",
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )

    # --- 7. Ingestion & Job Node (Immutable strategy) ---
    chunking_strategy: Literal["recursive", "token", "markdown", "latex", "semantic"] = Field(
        default="recursive",
        json_schema_extra={"mutable": False, "category": "Ingestion Node"}
    )
    chunk_size: int = Field(
        default=800, ge=100, le=4000,
        json_schema_extra={"mutable": False, "category": "Ingestion Node"}
    )
    chunk_overlap: int = Field(
        default=150, ge=0, le=1000,
        json_schema_extra={"mutable": False, "category": "Ingestion Node"}
    )
    job_concurrency: int = Field(
        default=3, ge=1, le=10,
        json_schema_extra={"mutable": True, "category": "Ingestion Node"}
    )

    # --- 8. UI / System Configuration ---
    show_reasoning: bool = Field(
        default=True, 
        json_schema_extra={"mutable": True, "category": "Interface"}
    )
    
    # Neo4j Graph Settings (Backend managed)
    neo4j_uri: Optional[str] = Field(default=None)
    neo4j_user: Optional[str] = Field(default=None)
    neo4j_password: Optional[str] = Field(default=None)

    def get_rag_hash(self) -> str:
        """Generate a hash based on core RAG parameters affecting embeddings."""
        import hashlib
        config_str = f"{self.embedding_provider}|{self.embedding_model}|{self.chunking_strategy}|{self.chunk_size}|{self.chunk_overlap}|{self.embedding_dim}|{self.rag_engine}"
        return hashlib.sha256(config_str.encode()).hexdigest()[:12]

class DocumentMetadata(BaseModel):
    id: str
    workspace_id: str
    filename: str
    extension: str
    minio_path: str
    status: Literal["uploaded", "indexing", "indexed", "failed"] = "uploaded"
    current_version: int = 1
    content_hash: str
    chunks: int = 0
    size_bytes: int = 0
    created_at: str
    updated_at: str
    shared_with: list[str] = []
