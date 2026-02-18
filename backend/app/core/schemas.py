from pydantic import BaseModel, Field
from typing import Optional, Literal

class AppSettings(BaseModel):
    # --- 1. Embedding Node (Immutable) ---
    embedding_provider: Literal["openai", "voyage", "local", "ollama", "vllm", "llama-cpp"] = Field(
        default="openai", 
        description="Embedding model provider",
        json_schema_extra={"mutable": False, "category": "Embedding Node"}
    )
    embedding_model: str = Field(
        default="text-embedding-3-small", 
        description="Embedding model name / version pin",
        json_schema_extra={"mutable": False, "category": "Embedding Node"}
    )
    embedding_dim: int = Field(
        default=1536, ge=64, le=8192,
        description="Embedding vector dimensions",
        json_schema_extra={"mutable": False, "category": "Embedding Node"}
    )
    embedding_batch_size: int = Field(
        default=32, ge=1, le=512,
        description="Documents per embedding batch",
        json_schema_extra={"mutable": True, "category": "Embedding Node"}
    )
    distance_metric: Literal["cosine", "dot", "l2"] = Field(
        default="cosine",
        description="Vector similarity distance metric",
        json_schema_extra={"mutable": False, "category": "Embedding Node"}
    )
    embedding_normalization: bool = Field(
        default=True,
        description="Normalize embedding vectors before storage",
        json_schema_extra={"mutable": False, "category": "Embedding Node"}
    )

    # --- 2. Retrieval Node (Mutable) ---
    rag_engine: Literal["basic", "graph"] = Field(
        default="basic", 
        description="Core retrieval engine type",
        json_schema_extra={"mutable": False, "category": "Retrieval Node"}
    )
    search_limit: int = Field(
        default=5, ge=1, le=50, 
        description="Top-K results returned to generation",
        json_schema_extra={"mutable": True, "category": "Retrieval Node"}
    )
    recall_k: int = Field(
        default=20, ge=1, le=100,
        description="Candidate pool size before reranking",
        json_schema_extra={"mutable": True, "category": "Retrieval Node"}
    )
    hybrid_alpha: float = Field(
        default=0.5, ge=0.0, le=1.0, 
        description="BM25 vs vector weight (0=BM25, 1=vector)",
        json_schema_extra={"mutable": True, "category": "Retrieval Node"}
    )
    score_threshold: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Minimum similarity score to include results",
        json_schema_extra={"mutable": True, "category": "Retrieval Node"}
    )
    retrieval_timeout: int = Field(
        default=30000, ge=1000, le=120000,
        description="Retrieval timeout in milliseconds",
        json_schema_extra={"mutable": True, "category": "Retrieval Node"}
    )

    # --- 3. Graph / Knowledge Node (Mutable toggles) ---
    graph_enabled: bool = Field(
        default=True,
        description="Enable knowledge graph traversal",
        json_schema_extra={"mutable": True, "category": "Graph Node"}
    )
    graph_hops: int = Field(
        default=2, ge=1, le=5,
        description="Graph traversal depth (max hops)",
        json_schema_extra={"mutable": True, "category": "Graph Node"}
    )
    graph_subgraph_limit: int = Field(
        default=20, ge=1, le=100,
        description="Max edges / nodes per subgraph query",
        json_schema_extra={"mutable": True, "category": "Graph Node"}
    )

    # --- 4. Reranking Node (Mutable) ---
    reranker_enabled: bool = Field(
        default=False,
        description="Enable result reranking",
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )
    reranker_provider: Literal["none", "cohere", "jina", "local"] = Field(
        default="none",
        description="Reranking model provider",
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )
    rerank_top_k: int = Field(
        default=3, ge=1, le=15,
        description="Max reranked candidates returned",
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )
    rerank_threshold: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Minimum rerank score threshold",
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )
    rerank_window: int = Field(
        default=10, ge=1, le=50,
        description="Rerank window size (candidates evaluated)",
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )
    rerank_latency_budget_ms: int = Field(
        default=5000, ge=500, le=30000,
        description="Reranking latency guardrail (ms)",
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )
    rerank_fallback: Literal["skip", "passthrough", "error"] = Field(
        default="passthrough",
        description="Behavior when reranker fails or times out",
        json_schema_extra={"mutable": True, "category": "Reranking Node"}
    )

    # --- 5. Agentic Node (Mutable) ---
    agentic_enabled: bool = Field(
        default=True,
        description="Enable agentic reasoning loop",
        json_schema_extra={"mutable": True, "category": "Agentic Node"}
    )
    agent_max_iterations: int = Field(
        default=5, ge=1, le=15,
        description="Max agent reasoning iterations",
        json_schema_extra={"mutable": True, "category": "Agentic Node"}
    )
    agent_tool_limit: int = Field(
        default=10, ge=1, le=30,
        description="Max tools available per agent step",
        json_schema_extra={"mutable": True, "category": "Agentic Node"}
    )
    agent_memory_scope: Literal["none", "session", "workspace"] = Field(
        default="session",
        description="Agent memory persistence scope",
        json_schema_extra={"mutable": True, "category": "Agentic Node"}
    )

    # --- 6. Generation Node (Mutable) ---
    llm_provider: Literal["openai", "anthropic", "ollama", "vllm", "llama-cpp"] = Field(
        default="openai", 
        description="LLM provider for generation",
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )
    llm_model: str = Field(
        default="gpt-4o", 
        description="LLM model name",
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )
    temperature: float = Field(
        default=0.7, ge=0.0, le=2.0,
        description="Sampling temperature (creativity)",
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )
    top_p: float = Field(
        default=1.0, ge=0.0, le=1.0,
        description="Nucleus sampling top-p",
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )
    max_tokens: int = Field(
        default=2048, ge=128, le=32768,
        description="Max output tokens per generation",
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )
    context_window_budget: int = Field(
        default=8192, ge=512, le=131072,
        description="Context window budget (tokens) for RAG context",
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )
    system_prompt: str = Field(
        default="You are an advanced reasoning assistant. Use the provided context to answer the user's question.",
        description="System prompt for generation",
        json_schema_extra={"mutable": True, "category": "Generation Node"}
    )

    # --- 7. Ingestion & Job Node (Immutable strategy) ---
    chunking_strategy: Literal["recursive", "token", "markdown", "latex", "semantic"] = Field(
        default="recursive",
        description="Text splitting algorithm",
        json_schema_extra={"mutable": False, "category": "Ingestion Node"}
    )
    chunking_unit: Literal["token", "character"] = Field(
        default="character",
        description="Token vs character based chunking",
        json_schema_extra={"mutable": False, "category": "Ingestion Node"}
    )
    chunk_size: int = Field(
        default=800, ge=100, le=4000,
        description="Chunk size (in chunking_unit)",
        json_schema_extra={"mutable": False, "category": "Ingestion Node"}
    )
    chunk_overlap: int = Field(
        default=150, ge=0, le=1000,
        description="Overlap between chunks",
        json_schema_extra={"mutable": False, "category": "Ingestion Node"}
    )
    structural_chunking: bool = Field(
        default=False,
        description="Respect structural boundaries (headers, code blocks)",
        json_schema_extra={"mutable": False, "category": "Ingestion Node"}
    )
    max_chunks_per_document: int = Field(
        default=500, ge=10, le=5000,
        description="Max chunks per document",
        json_schema_extra={"mutable": False, "category": "Ingestion Node"}
    )
    job_concurrency: int = Field(
        default=3, ge=1, le=10,
        description="Parallel ingestion jobs",
        json_schema_extra={"mutable": True, "category": "Ingestion Node"}
    )

    # --- 8. UI / System Configuration ---
    show_reasoning: bool = Field(
        default=True, 
        description="Show reasoning steps in chat",
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
