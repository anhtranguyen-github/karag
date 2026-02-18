from .document.document_upload_service import DocumentUploadService
from .document.document_ingestion_service import DocumentIngestionService
from .document.cross_workspace_service import CrossWorkspaceDocumentService
from .document.document_inspection_service import DocumentInspectionService
from .document.storage_service import StorageService

class DocumentService(
    DocumentUploadService,
    DocumentIngestionService,
    CrossWorkspaceDocumentService,
    DocumentInspectionService,
    StorageService
):
    """Facade for document operations, aggregating modular services."""
    pass

document_service = DocumentService()
