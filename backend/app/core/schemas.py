from pydantic import BaseModel, Field
from typing import Optional, Literal

class AppSettings(BaseModel):
    # LLM Settings
    llm_provider: str = Field(default="openai", description="LLM Provider (openai, anthropic, ollama, vllm, llama-cpp)")
    llm_model: str = Field(default="gpt-4o", description="Model name")
    
    # Embedding Settings
    embedding_provider: str = Field(default="openai", description="Embedding Provider (openai, voyage, local, ollama, vllm, llama-cpp)")
    embedding_model: str = Field(default="text-embedding-3-small", description="Embedding model name")
    
    # Retrieval Engine Selection (IMMUTABLE at workspace creation)
    rag_engine: Literal["basic", "graph"] = Field(default="basic", description="Selected workspace engine")
    
    # Retrieval Settings
    retrieval_mode: Literal["hybrid", "vector", "keyword"] = Field(default="hybrid", description="Search strategy")
    search_limit: int = Field(default=5, ge=1, le=20, description="Top-K results")
    hybrid_alpha: float = Field(default=0.5, ge=0.0, le=1.0, description="Weight between vector and keyword")
    
    # RAG Config (Fixed at workspace creation for consistency)
    chunk_size: int = Field(default=800, ge=100, le=2000)
    chunk_overlap: int = Field(default=150, ge=0, le=500)
    embedding_dim: int = Field(default=1536, description="Fixed dimension for vector consistency")
    
    # Neo4j Graph Settings (Used if rag_engine='graph')
    neo4j_uri: Optional[str] = Field(default=None)
    neo4j_user: Optional[str] = Field(default=None)
    neo4j_password: Optional[str] = Field(default=None)
    
    # UI/System Settings
    theme: str = Field(default="dark", description="App theme")
    show_reasoning: bool = Field(default=True, description="Toggle reasoning steps visibility")
    
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
