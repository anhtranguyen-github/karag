from src.backend.app.services.document.cross_workspace_service import CrossWorkspaceDocumentService
from src.backend.app.services.document.document_ingestion_service import DocumentIngestionService
from src.backend.app.services.document.document_inspection_service import DocumentInspectionService
from src.backend.app.services.document.document_upload_service import DocumentUploadService
from src.backend.app.services.document.storage_service import StorageService


class DocumentService(
    DocumentUploadService,
    DocumentIngestionService,
    CrossWorkspaceDocumentService,
    DocumentInspectionService,
    StorageService,
):
    """Facade for document operations, aggregating modular services."""

    pass


document_service = DocumentService()
