from typing import Literal

from pydantic import BaseModel, Field


class VectorSearchConfig(BaseModel):
    enabled: bool = True
    embedding_model_ref: str | None = None
    top_k: int = Field(default=5, ge=1, le=100)
    similarity_metric: Literal["cosine", "dot", "l2"] = "cosine"
    score_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    enable_score_normalization: bool = True


class SparseRetrievalConfig(BaseModel):
    enabled: bool = False
    bm25_k1: float = Field(default=1.5, ge=0.0, le=5.0)
    bm25_b: float = Field(default=0.75, ge=0.0, le=1.0)
    top_k: int = Field(default=5, ge=1, le=100)
    min_term_match: int = Field(default=1, ge=1, le=10)


class HybridRetrievalConfig(BaseModel):
    enabled: bool = False
    dense_weight: float = Field(default=0.5, ge=0.0, le=1.0)
    sparse_weight: float = Field(default=0.5, ge=0.0, le=1.0)
    fusion_strategy: Literal["rrf", "weighted_sum"] = "weighted_sum"
    top_k: int = Field(default=5, ge=1, le=100)
    normalize_scores: bool = True


class RerankConfig(BaseModel):
    enabled: bool = False
    provider: Literal["cohere", "openai", "local"] = "local"
    model: str = "bge-reranker-large"
    top_n: int = Field(default=3, ge=1, le=50)
    rerank_batch_size: int = Field(default=16, ge=1, le=128)
    rerank_threshold: float = Field(default=0.0, ge=0.0, le=1.0)
    score_normalization: bool = True


class GraphRetrievalConfig(BaseModel):
    enabled: bool = False
    graph_type: Literal["knowledge", "document_relationship"] = "knowledge"
    max_hops: int = Field(default=2, ge=1, le=5)
    edge_types: list[str] = Field(default_factory=list)
    node_score_decay: float = Field(default=0.5, ge=0.0, le=1.0)
    merge_graph_with_vector: bool = True
    graph_confidence_threshold: float = Field(default=0.3, ge=0.0, le=1.0)


class AdvancedQueryConfig(BaseModel):
    query_embedding_batch_size: int = Field(default=1, ge=1, le=32)
    max_query_tokens: int = Field(default=512, ge=64, le=2048)
    enable_query_expansion: bool = False
    pm125_mode: Literal["off", "strict", "relaxed"] = "off"


class RetrievalPipelineConfig(BaseModel):
    vector: VectorSearchConfig = Field(default_factory=VectorSearchConfig)
    sparse: SparseRetrievalConfig = Field(default_factory=SparseRetrievalConfig)
    hybrid: HybridRetrievalConfig = Field(default_factory=HybridRetrievalConfig)
    rerank: RerankConfig = Field(default_factory=RerankConfig)
    graph: GraphRetrievalConfig = Field(default_factory=GraphRetrievalConfig)
    advanced: AdvancedQueryConfig = Field(default_factory=AdvancedQueryConfig)


# Compatibility shim for overall configuration
RetrievalConfig = RetrievalPipelineConfig
