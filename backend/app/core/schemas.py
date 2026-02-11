from pydantic import BaseModel, Field
from typing import Optional, Literal

class AppSettings(BaseModel):
    # LLM Settings (Mutable - used only at generation time)
    llm_provider: Literal["openai", "anthropic", "ollama", "vllm", "llama-cpp"] = Field(
        default="openai", 
        description="LLM Provider",
        json_schema_extra={"mutable": True, "category": "Intelligence"}
    )
    llm_model: str = Field(
        default="gpt-4o", 
        description="Model name",
        json_schema_extra={"mutable": True, "category": "Intelligence"}
    )
    
    # Embedding Settings (Immutable - changing these requires re-embedding all existing data)
    embedding_provider: Literal["openai", "voyage", "local", "ollama", "vllm", "llama-cpp"] = Field(
        default="openai", 
        description="Embedding Provider",
        json_schema_extra={"mutable": False, "category": "Vectorization"}
    )
    embedding_model: str = Field(
        default="text-embedding-3-small", 
        description="Embedding model name",
        json_schema_extra={"mutable": False, "category": "Vectorization"}
    )
    
    # Retrieval Engine Selection (Immutable - dictates the structural storage (Qdrant vs Neo4j) and data layout)
    rag_engine: Literal["basic", "graph"] = Field(
        default="basic", 
        description="Selected workspace engine",
        json_schema_extra={"mutable": False, "category": "System Pipeline"}
    )
    
    # Retrieval Settings (Mutable - parameters applied only at query time without rebuilding indices)
    search_limit: int = Field(
        default=5, ge=1, le=20, 
        description="Top-K results",
        json_schema_extra={"mutable": True, "category": "Search Tuning"}
    )
    hybrid_alpha: float = Field(
        default=0.5, ge=0.0, le=1.0, 
        description="Weight between vector and keyword scores",
        json_schema_extra={"mutable": True, "category": "Search Tuning"}
    )
    
    # RAG Config (Immutable - affects document splitting and vector dimensionality)
    chunk_size: int = Field(
        default=800, ge=100, le=2000,
        json_schema_extra={"mutable": False, "category": "Indexing"}
    )
    chunk_overlap: int = Field(
        default=150, ge=0, le=500,
        json_schema_extra={"mutable": False, "category": "Indexing"}
    )
    embedding_dim: int = Field(
        default=1536, 
        description="Fixed dimension for vector consistency",
        json_schema_extra={"mutable": False, "category": "Vectorization"}
    )
    
    # Neo4j Graph Settings (Immutable - connection to a specific knowledge graph structure)
    neo4j_uri: Optional[str] = Field(
        default=None,
        json_schema_extra={"mutable": False, "category": "Graph Engine"}
    )
    neo4j_user: Optional[str] = Field(
        default=None,
        json_schema_extra={"mutable": False, "category": "Graph Engine"}
    )
    neo4j_password: Optional[str] = Field(
        default=None,
        json_schema_extra={"mutable": False, "category": "Graph Engine"}
    )
    
    # UI/System Settings (Mutable - purely interface or logic state)
    theme: str = Field(
        default="dark", 
        description="App theme",
        json_schema_extra={"mutable": True, "category": "Interface"}
    )
    show_reasoning: bool = Field(
        default=True, 
        description="Toggle reasoning steps visibility",
        json_schema_extra={"mutable": True, "category": "Interface"}
    )
    
    def get_rag_hash(self) -> str:
        """Generate a hash based on core RAG parameters affecting embeddings."""
        import hashlib
        config_str = f"{self.embedding_provider}|{self.embedding_model}|{self.chunk_size}|{self.chunk_overlap}|{self.embedding_dim}|{self.rag_engine}"
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
