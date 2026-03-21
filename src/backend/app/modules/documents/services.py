from __future__ import annotations
import logging
from typing import Any
from fastapi import UploadFile, HTTPException, status
from app.core.tenancy import TenantContext
from app.core.ports.message_broker import JobMessage
from app.workers.job_types import DOCUMENT_INGEST
from app.modules.documents.schemas import DocumentSummary

logger = logging.getLogger(__name__)

class DocumentService:
    """
    Service to manage Documents belonging to Projects.
    Acts as the entry point for the document ingestion pipeline.
    Supports both sync (in-request) and async (queue-based) ingestion.
    """
    def __init__(self, karag_manager: Any) -> None:
        self.karag_manager = karag_manager

    async def upload_document(
        self, 
        tenant: TenantContext, 
        project_id: str, 
        file: UploadFile,
        async_ingest: bool = False,
    ) -> DocumentSummary:
        # 1. Explicit permission check
        if "doc.upload" not in tenant.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="User lacks doc.upload permission."
            )

        # 2. Verify existence and access
        project = self.karag_manager.projects.get(tenant.organization_id, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

        content = await file.read()
        filename = file.filename or "untitled"
        extension = filename.rsplit(".", 1)[-1] if "." in filename else ""
        storage_path = f"orgs/{tenant.organization_id}/projects/{project_id}/docs/{filename}"

        # 3. Always store to object storage first
        self.karag_manager.storage.store_object(storage_path, content)

        # 4. Create document record in DB (status: pending if async, processing if sync)
        from app.modules.documents.schemas import DocumentCreate
        doc_create = DocumentCreate(
            project_id=project_id,
            organization_id=tenant.organization_id,
            title=filename,
            extension=extension,
            file_size=len(content),
            storage_path=storage_path,
        )
        doc_summary = self.karag_manager.documents_repository.create(doc_create)

        # 5. Ingest: async (publish job) or sync (inline)
        workspace_id = tenant.workspace_id
        if async_ingest:
            job = JobMessage(
                job_type=DOCUMENT_INGEST,
                payload={
                    "filename": filename,
                    "content_path": storage_path,
                    "extension": extension,
                    "project_id": project_id,
                    "workspace_id": workspace_id or "",
                    "document_id": doc_summary.id,
                },
                organization_id=tenant.organization_id,
                project_id=project_id,
                workspace_id=workspace_id or "",
                actor_id=tenant.actor_id,
            )
            await self.karag_manager.broker.publish(job)
            logger.info("document.queued filename=%s job_id=%s", filename, job.job_id)
        else:
            try:
                await self.karag_manager.ingest_document(
                    tenant=tenant,
                    project_id=project_id,
                    workspace_id=workspace_id,
                    filename=filename,
                    content=content,
                    extension=extension,
                )
            except Exception as e:
                logger.error("Failed to ingest document %s: %s", filename, e)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Ingestion failed: {e!s}"
                )

        return doc_summary

    def list_documents(self, tenant: TenantContext, project_id: str) -> list[DocumentSummary]:
        if "doc.view" not in tenant.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="User lacks doc.view permission."
            )
        return self.karag_manager.documents_repository.list_for_project(tenant.organization_id, project_id)
