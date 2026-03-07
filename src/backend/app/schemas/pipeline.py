from typing import Literal

from pydantic import BaseModel, Field

# =============================================================================
# PIPELINE CONFIGURATION
# =============================================================================


class ReaderConfig(BaseModel):
    """Configuration for document readers."""

    pdf_reader: str = Field(default="pymupdf", description="PDF reader to use (e.g. pymupdf, unstructured)")
    html_reader: str = Field(default="trafilatura", description="HTML reader to use")
    docx_reader: str = Field(default="python-docx", description="DOCX reader to use")


class ChunkingConfig(BaseModel):
    """Configuration for text chunking."""

    strategy: Literal["recursive", "semantic", "markdown", "code-aware"] = Field(default="recursive")
    chunk_size: int = Field(default=1024, ge=100)
    chunk_overlap: int = Field(default=100, ge=0)
    metadata_extraction: bool = Field(default=True)


class EmbeddingConfig(BaseModel):
    """Configuration for embeddings."""

    provider: Literal["openai", "huggingface", "sentence-transformers", "local"] = Field(default="openai")
    model: str = Field(default="text-embedding-3-small")
    dimension: int = Field(default=1536, ge=128)
    batch_size: int = Field(default=32, ge=1)


class RetrievalConfig(BaseModel):
    """Configuration for retrieval strategy."""

    strategy: Literal["vector", "bm25", "hybrid"] = Field(default="hybrid")
    vector_weight: float = Field(default=0.7, ge=0.0, le=1.0)
    bm25_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    top_k: int = Field(default=5, ge=1)


class RerankerConfig(BaseModel):
    """Configuration for reranking results."""

    enabled: bool = Field(default=False)
    provider: Literal["cohere", "cross-encoder", "jina", "none"] = Field(default="none")
    model: str = Field(default="cross-encoder/ms-marco-MiniLM-L-6-v2")
    top_k: int = Field(default=3, ge=1)


class GenerationConfig(BaseModel):
    """Configuration for LLM generation."""

    provider: Literal["openai", "anthropic", "local", "groq"] = Field(default="openai")
    model: str = Field(default="gpt-4o-mini")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1)


class SearchEngineConfig(BaseModel):
    """Configuration for the search engine pipeline layer."""

    multi_query: bool = Field(default=False, description="Enable multi-query generation")
    query_rewrite: bool = Field(default=False, description="Enable query rewriting")
    self_query_retrieval: bool = Field(default=False, description="Enable metadata filtering via self-query")


class PipelineConfig(BaseModel):
    """Complete pipeline configuration for a workspace."""

    id: str = Field(..., description="Pipeline identifier (pipe_xxx)")
    workspace_id: str = Field(..., description="Owning workspace")
    name: str = Field(..., min_length=1, max_length=100)

    reader: ReaderConfig = Field(default_factory=ReaderConfig)
    chunking: ChunkingConfig = Field(default_factory=ChunkingConfig)
    embedding: EmbeddingConfig = Field(default_factory=EmbeddingConfig)
    retrieval: RetrievalConfig = Field(default_factory=RetrievalConfig)
    reranker: RerankerConfig = Field(default_factory=RerankerConfig)
    search_engine: SearchEngineConfig = Field(default_factory=SearchEngineConfig)
    generation: GenerationConfig = Field(default_factory=GenerationConfig)
