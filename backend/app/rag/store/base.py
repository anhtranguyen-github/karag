from abc import ABC, abstractmethod
from typing import List, Optional, Any, Dict
from pydantic import BaseModel

from backend.app.schemas.database import IngestionConfig
from backend.app.schemas.retrieval import RetrievalConfig

class DocumentPoint(BaseModel):
    id: str
    vector: List[float]
    payload: Dict[str, Any]
    sparse_vector: Optional[Dict[str, Any]] = None

class SearchResult(BaseModel):
    id: str
    score: float
    payload: Dict[str, Any]

class VectorStore(ABC):
    @abstractmethod
    async def create_collection_if_not_exists(self, config: IngestionConfig) -> bool:
        """Create the collection/index based on the ingestion config if it doesn't exist."""
        pass

    @abstractmethod
    async def upsert_documents(self, config: IngestionConfig, points: List[DocumentPoint]) -> bool:
        """Upsert document points (vectors + payloads) into the store."""
        pass

    @abstractmethod
    async def search(self, config: RetrievalConfig, query_vector: List[float], query_text: str, workspace_id: Optional[str] = None) -> List[SearchResult]:
        """Perform a hybrid search using both dense vector and keyword/sparse strategies."""
        pass

    @abstractmethod
    async def delete_document(self, config: IngestionConfig, source_name: str) -> bool:
        """Delete all points associated with a specific document source."""
        pass

    @abstractmethod
    async def list_documents(self, config: IngestionConfig) -> List[Dict[str, Any]]:
        """List documents present in the given workspace/collection."""
        pass

    @abstractmethod
    async def get_document_content(self, config: IngestionConfig, source_name: str) -> str:
        """Reconstruct the entire document content from its chunks."""
        pass

    @abstractmethod
    async def get_document_centroids(self, config: IngestionConfig) -> List[Dict[str, Any]]:
        """Calculate the average vector (centroid) for each document."""
        pass

    @abstractmethod
    async def sync_shared_with(self, config: IngestionConfig, doc_id: str, shared_with: List[str]) -> bool:
        """Update shared_with list for all points of a document."""
        pass

    @abstractmethod
    async def get_document_chunks(self, config: IngestionConfig, doc_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve vector chunks associated with a specific document ID."""
        pass

    @abstractmethod
    async def purge_documents(self, doc_ids: List[str]) -> None:
        """Completely purge all vectors for the given document IDs across all logical collections."""
        pass

    @abstractmethod
    async def purge_workspace(self, workspace_id: str) -> None:
        """Completely purge all vectors for the given workspace."""
        pass

    @abstractmethod
    async def get_system_info(self) -> Dict[str, Any]:
        """Get system info / status of the vector store."""
        pass
