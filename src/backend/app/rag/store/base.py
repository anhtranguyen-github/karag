from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel
from src.backend.app.schemas.database import IngestionConfig
from src.backend.app.schemas.retrieval import RetrievalConfig


class DocumentPoint(BaseModel):
    id: str
    vector: list[float]
    payload: dict[str, Any]
    sparse_vector: dict[str, Any] | None = None


class SearchResult(BaseModel):
    id: str
    score: float
    payload: dict[str, Any]


class VectorStore(ABC):
    @abstractmethod
    async def create_collection_if_not_exists(self, config: IngestionConfig) -> bool:
        """Create the collection/index based on the ingestion config if it doesn't exist."""
        pass

    @abstractmethod
    async def upsert_documents(self, config: IngestionConfig, points: list[DocumentPoint]) -> bool:
        """Upsert document points (vectors + payloads) into the store."""
        pass

    @abstractmethod
    async def search(
        self,
        config: RetrievalConfig,
        query_vector: list[float],
        query_text: str,
        workspace_id: str,
        collection_name: str | None = None,
    ) -> list[SearchResult]:
        """Perform a hybrid search using both dense vector and keyword/sparse strategies."""
        pass

    @abstractmethod
    async def delete_document(self, config: IngestionConfig, doc_id: str) -> bool:
        """Delete all points associated with a specific document ID (MongoDB SoT)."""
        pass

    @abstractmethod
    async def list_documents(self, config: IngestionConfig) -> list[dict[str, Any]]:
        """List documents present in the given workspace/collection."""
        pass

    @abstractmethod
    async def get_document_content(self, config: IngestionConfig, doc_id: str) -> str:
        """Reconstruct the entire document content from its chunks using doc_id."""
        pass

    @abstractmethod
    async def get_document_centroids(self, config: IngestionConfig) -> list[dict[str, Any]]:
        """Calculate the average vector (centroid) for each document."""
        pass

    @abstractmethod
    async def sync_shared_with(self, config: IngestionConfig, doc_id: str, shared_with: list[str]) -> bool:
        """Update shared_with list for all points of a document."""
        pass

    @abstractmethod
    async def get_document_chunks(self, config: IngestionConfig, doc_id: str, limit: int = 100) -> list[dict[str, Any]]:
        """Retrieve vector chunks associated with a specific document ID."""
        pass

    @abstractmethod
    async def purge_documents(self, doc_ids: list[str]) -> None:
        """Completely purge all vectors for the given document IDs across all logical collections."""
        pass

    @abstractmethod
    async def purge_workspace(self, workspace_id: str) -> None:
        """Completely purge all vectors for the given workspace."""
        pass

    @abstractmethod
    async def get_system_info(self) -> dict[str, Any]:
        """Get system info / status of the vector store."""
        pass
