from __future__ import annotations

from typing import Any, List, Dict, Optional
from pydantic import BaseModel, Field

from app.rag.schemas.types import FileStatus, RetrievedChunk, ChatMessage, PIISpan


class RAGChunk(BaseModel):
    """Chunk of text in the RAG system (persistent)."""
    chunk_id: str
    document_id: str
    content: str
    content_without_overlap: str
    start_i: int
    end_i: int
    metadata: Dict[str, Any] = Field(default_factory=dict)
    embedded_contexts: List[Dict[str, Any]] = Field(default_factory=list) # e.g. vector, score, etc.

class RAGDocument(BaseModel):
    """The logical document in the RAG system (persistent)."""
    id: Optional[str] = None # Added for consistency with DB row
    document_id: str # internal document ID
    file_id: Optional[str] = None # link to FileConfig (persistent storage metadata)
    workspace_id: str
    content: Optional[str] = None # full parsed content
    title: str
    source: Optional[str] = None
    labels: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict) # e.g. organization_id, project_id, flags
    
    # Trackable ingestion fields
    status: FileStatus = FileStatus.PENDING
    progress: int = 0
    error_message: Optional[str] = None
    chunk_count: int = 0
    
    chunks: List[RAGChunk] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class QueryAnalysis(BaseModel):
    """Result of Pre-Retrieval stage."""
    original_query: str
    condensed_query: str
    expanded_queries: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    is_safe: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RetrievalSet(BaseModel):
    """Result of Retrieval stage."""
    query_analysis: QueryAnalysis
    candidates: List[RetrievedChunk]
    fusion_scores: Dict[str, float] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RefinedContext(BaseModel):
    """Result of Post-Retrieval stage."""
    ranked_chunks: List[RetrievedChunk]
    masked_spans: List[PIISpan] = Field(default_factory=list)
    provenance_map: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class InferencePrompt(BaseModel):
    """Input to the Generation stage."""
    messages: List[ChatMessage]
    token_usage: Dict[str, int] = Field(default_factory=dict)
    context_chunks: List[RetrievedChunk] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


