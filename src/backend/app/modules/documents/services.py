from __future__ import annotations
import logging
from typing import Any
from fastapi import UploadFile, HTTPException, status
from app.core.tenancy import TenantContext
from app.modules.documents.schemas import DocumentCreate, DocumentIngestionResponse, DocumentSummary

logger = logging.getLogger(__name__)

class DocumentService:
    """
    Service to manage Documents belonging to Projects and Workspaces.
    Supports both sync (in-request) and async (queue-based) ingestion.
    """
    def __init__(self, karag_manager: Any) -> None:
        self.karag_manager = karag_manager

    async def upload_document(
        self, 
        tenant: TenantContext, 
        project_id: str, 
        file: UploadFile,
        workspace_id: str | None = None,
        track_id: str | None = None,
    ) -> DocumentSummary | DocumentIngestionResponse:
        # 1. Explicit permission check
        if "doc.upload" not in tenant.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="User lacks doc.upload permission."
            )

        if tenant.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Project scope does not match the authenticated tenant context."
            )

        if workspace_id and tenant.workspace_id and tenant.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Workspace scope does not match the authenticated tenant context."
            )

        # 2. Verify project existence
        project = self.karag_manager.projects.get(tenant.organization_id, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

        content = await file.read()
        filename = file.filename or "untitled"
        extension = filename.rsplit(".", 1)[-1] if "." in filename else ""

        # Build storage path with optional workspace scope
        if workspace_id:
            storage_path = f"orgs/{tenant.organization_id}/projects/{project_id}/workspaces/{workspace_id}/docs/{filename}"
        else:
            storage_path = f"orgs/{tenant.organization_id}/projects/{project_id}/docs/{filename}"

        doc_create = DocumentCreate(
            project_id=project_id,
            organization_id=tenant.organization_id,
            title=filename,
            extension=extension,
            file_size=len(content),
            storage_path=storage_path,
            source="upload",
            status="uploading",
        )
        doc_summary = self.karag_manager.documents_repository.create(doc_create)

        # 3. Store to object storage
        try:
            self.karag_manager.storage.store_object(storage_path, content)
            self.karag_manager.documents_repository.update_status(
                tenant.organization_id,
                project_id,
                doc_summary.id,
                "uploaded",
            )
        except Exception:
            self.karag_manager.documents_repository.update_status(
                tenant.organization_id,
                project_id,
                doc_summary.id,
                "failed",
            )
            raise

        doc_summary = self.karag_manager.documents_repository.get(
            tenant.organization_id,
            project_id,
            doc_summary.id,
        ) or doc_summary

        # 5. Link to workspace and trigger RAG if workspace_id provided
        if workspace_id:
            ingestion = await self.karag_manager.workspace_service.add_document(
                tenant,
                workspace_id,
                doc_summary.id,
                track_id=track_id,
            )
            return DocumentIngestionResponse(
                document=self.karag_manager.documents_repository.get(
                    tenant.organization_id,
                    project_id,
                    doc_summary.id,
                ) or doc_summary,
                ingestion=ingestion,
            )

        return doc_summary


    def list_documents(self, tenant: TenantContext, project_id: str) -> list[DocumentSummary]:
        if "doc.view" not in tenant.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="User lacks doc.view permission."
            )
        if tenant.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Project scope does not match the authenticated tenant context."
            )
        docs = self.karag_manager.documents_repository.list_for_project(tenant.organization_id, project_id)
        doc_ids = [doc.id for doc in docs]
        workspace_counts = self.karag_manager.doc_workspace_links.count_by_document_ids(doc_ids)
        latest_jobs = self.karag_manager.ingestion_jobs_repository.latest_for_document_ids(doc_ids)

        enriched: list[DocumentSummary] = []
        for doc in docs:
            latest_job = latest_jobs.get(doc.id)
            doc_payload = doc.model_dump()
            doc_payload["workspace_count"] = workspace_counts.get(doc.id, 0)
            doc_payload["latest_ingestion"] = latest_job.model_dump() if latest_job else None
            doc_payload["status"] = latest_job.status if latest_job else (doc.status or "uploaded")
            enriched.append(DocumentSummary(**doc_payload))
        return enriched

    def list_workspace_documents(self, tenant: TenantContext, project_id: str, workspace_id: str) -> list[DocumentSummary]:
        if "doc.view" not in tenant.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="User lacks doc.view permission."
            )
        if tenant.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Project scope does not match the authenticated tenant context."
            )
        if tenant.workspace_id and tenant.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Workspace scope does not match the authenticated tenant context."
            )
        docs = self.karag_manager.documents_repository.list_for_workspace(tenant.organization_id, project_id, workspace_id)
        doc_ids = [doc.id for doc in docs]
        latest_jobs = self.karag_manager.ingestion_jobs_repository.latest_for_document_ids(doc_ids, workspace_id=workspace_id)
        enriched: list[DocumentSummary] = []
        for doc in docs:
            latest_job = latest_jobs.get(doc.id)
            doc_payload = doc.model_dump()
            doc_payload["workspace_count"] = 1
            doc_payload["latest_ingestion"] = latest_job.model_dump() if latest_job else None
            doc_payload["status"] = latest_job.status if latest_job else doc.status
            enriched.append(DocumentSummary(**doc_payload))
        return enriched

    async def delete_document(self, tenant: TenantContext, project_id: str, document_id: str) -> None:
        if "doc.delete" not in tenant.permissions and "doc.upload" not in tenant.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User lacks document delete permission."
            )
        if tenant.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Project scope does not match the authenticated tenant context."
            )

        doc = self.karag_manager.documents_repository.get(tenant.organization_id, project_id, document_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        workspace_ids = self.karag_manager.doc_workspace_links.list_by_document(document_id)
        for workspace_id in workspace_ids:
            try:
                setting = self.karag_manager.workspace_service.get_rag_config(tenant, workspace_id)
                from app.rag.utils.utils import resolve_collection_name
                from app.rag.schemas.types import RagContext

                context = RagContext(
                    organization_id=tenant.organization_id,
                    project_id=tenant.project_id,
                    workspace_id=workspace_id,
                    dataset_id="default",
                    collection_name=resolve_collection_name("default", setting.embedding.model),
                    filters={"workspace_id": workspace_id},
                    top_k=setting.retriever.top_k,
                )
                await self.karag_manager.rag_manager.delete_document(document_id, context, setting)
            except Exception:
                logger.exception(
                    "document.delete.vector_cleanup_failed document_id=%s workspace_id=%s",
                    document_id,
                    workspace_id,
                )

        try:
            self.karag_manager.storage.delete_prefix(doc.storage_path)
        except Exception:
            logger.exception("document.delete.storage_cleanup_failed document_id=%s", document_id)

        self.karag_manager.ingestion_jobs_repository.delete_by_document(document_id)
        self.karag_manager.rag_documents_repository.delete_by_document(document_id)
        self.karag_manager.doc_workspace_links.delete_by_document(document_id)
        self.karag_manager.documents_repository.delete(tenant.organization_id, project_id, document_id)
