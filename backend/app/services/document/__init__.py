from .ingestion_service import IngestionService
from .indexing_service import IndexingService
from .orchestration_service import OrchestrationService
from .query_service import QueryService
from .storage_service import StorageService

class DocumentService(
    IngestionService,
    IndexingService,
    OrchestrationService,
    QueryService,
    StorageService
):
    """Facade for document operations, aggregating modular services."""
    pass

document_service = DocumentService()
