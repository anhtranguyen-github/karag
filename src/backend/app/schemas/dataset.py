from datetime import datetime
from typing import Literal

from src.backend.app.schemas.baas import FileStoreConfig, VectorStoreConfig
from pydantic import BaseModel, Field

# =============================================================================
# DATASET AND CONNECTORS CONFIGURATION
# =============================================================================


class ConnectorBase(BaseModel):
    id: str = Field(...)
    workspace_id: str = Field(...)
    name: str = Field(..., max_length=100)
    type: Literal["qdrant", "pinecone", "weaviate", "neo4j", "notion", "google_drive", "github", "confluence"]
    status: Literal["active", "error", "syncing"] = Field(default="active")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class QdrantConnector(ConnectorBase):
    type: Literal["qdrant"] = "qdrant"
    url: str
    port: int = 6333


class Neo4jConnector(ConnectorBase):
    type: Literal["neo4j"] = "neo4j"
    uri: str


class Dataset(BaseModel):
    """
    Dataset - logical storage unit representing chunks & docs.
    Replaces "document storage" to follow standard naming.
    """

    id: str = Field(..., description="Dataset identifier (ds_xxx)")
    workspace_id: str = Field(..., description="Owner workspace")
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)

    # Each dataset links to a pipeline config (chunking, embedding config)
    pipeline_id: str = Field(..., description="Configures chunking/embeddings")

    # Store settings
    vector_store_config: VectorStoreConfig = Field(default_factory=VectorStoreConfig)
    file_store_config: FileStoreConfig = Field(default_factory=FileStoreConfig)

    # Status
    is_active: bool = Field(True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Stats
    document_count: int = Field(0, ge=0)
    total_chunks: int = Field(0, ge=0)
    total_size_bytes: int = Field(0, ge=0)

