from __future__ import annotations

from datetime import UTC, datetime
import logging
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status
from pydantic import ValidationError

from app.karag_manager import KaragManager
from app.core.events import TransactionalOutbox, WORKSPACE_UPDATED, build_event
from app.core.tenancy import TenantContext, require_workspace_scope
from app.modules.workspaces.schemas import (
    WorkspaceCreate,
    WorkspaceSetting,
    WorkspaceSettingUpdate,
    WorkspaceSummary,
    WorkspaceUpdate,
)
from app.modules.workspaces.setting_manager import WorkspaceSettingManager
from app.modules.documents.schemas import BulkIngestionResponse, IngestionTrackerSummary

logger = logging.getLogger(__name__)


class WorkspaceService:
    def __init__(self, karag_manager: KaragManager) -> None:
        self.karag_manager = karag_manager

    def create_workspace(self, tenant: TenantContext, payload: WorkspaceCreate) -> WorkspaceSummary:
        if "workspace.create" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        from nanoid import generate as nanoid
        workspace_id = payload.id or nanoid()
        
        # Verify scope if provided in tenant context
        require_workspace_scope(tenant, workspace_id)

        if not self.karag_manager.organizations.get(tenant.organization_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found.",
            )
        if not self.karag_manager.projects.get(tenant.organization_id, tenant.project_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found.",
            )
        existing = self.karag_manager.workspaces.get(tenant, workspace_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Workspace already exists for this tenant.",
            )
        workspace = self.karag_manager.workspaces.create(
            WorkspaceSummary(
                id=workspace_id,
                organization_id=tenant.organization_id,
                project_id=tenant.project_id,
                name=payload.name,
                description=payload.description,
                status="active",
                created_at=datetime.now(UTC),
            )
        )
        default_setting = WorkspaceSettingManager.build_default(workspace_id=workspace.id)
        self.karag_manager.workspace_settings.upsert(tenant, default_setting)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=WORKSPACE_UPDATED,
                tenant=tenant,
                resource_id=workspace.id,
                payload={"action": "created"},
                workspace_id=workspace.id,
            )
        )
        outbox.flush(self.karag_manager.event_bus)
        return workspace

    def list_workspaces(self, tenant: TenantContext) -> list[WorkspaceSummary]:
        if "workspace.view" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return self.karag_manager.workspaces.list(tenant)

    def get_workspace(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSummary:
        if "workspace.view" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        workspace = self.karag_manager.workspaces.get(tenant, workspace_id)
        if not workspace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        require_workspace_scope(tenant, workspace.id)
        return workspace

    def ensure_workspace(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSummary:
        require_workspace_scope(tenant, workspace_id)
        workspace = self.karag_manager.workspaces.get(tenant, workspace_id)
        if not workspace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return workspace

    def get_rag_config(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSetting:
        workspace = self.ensure_workspace(tenant, workspace_id)
        config = self.karag_manager.workspace_settings.get(tenant, workspace.id)
        if config:
            return config
        config = WorkspaceSettingManager.build_default(workspace_id=workspace.id)
        return self.karag_manager.workspace_settings.upsert(tenant, config)

    def update_rag_config(
        self, tenant: TenantContext, workspace_id: str, payload: WorkspaceSettingUpdate
    ) -> WorkspaceSetting:
        if "workspace.edit" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        workspace = self.ensure_workspace(tenant, workspace_id)
        current = self.get_rag_config(tenant, workspace.id)
        try:
            config = WorkspaceSettingManager.merge(current, payload)
        except ValidationError as exc:
            errors = [e["msg"] for e in exc.errors()]
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"message": "Invalid RAG component configuration.", "errors": errors},
            )

        saved = self.karag_manager.workspace_settings.upsert(tenant, config)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=WORKSPACE_UPDATED,
                tenant=tenant,
                resource_id=workspace.id,
                payload={"action": "rag_config_updated"},
                workspace_id=workspace.id,
            )
        )
        outbox.flush(self.karag_manager.event_bus)
        return saved

    def delete_workspace(self, tenant: TenantContext, workspace_id: str) -> None:
        if "workspace.delete" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        workspace = self.get_workspace(tenant, workspace_id)
        self.karag_manager.workspace_settings.delete(tenant, workspace.id)
        self.karag_manager.workspaces.delete(tenant, workspace.id)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=WORKSPACE_UPDATED,
                tenant=tenant,
                resource_id=workspace.id,
                payload={"action": "deleted"},
                workspace_id=workspace.id,
            )
        )
        outbox.flush(self.karag_manager.event_bus)

    def update_workspace(
        self, tenant: TenantContext, workspace_id: str, payload: WorkspaceUpdate
    ) -> WorkspaceSummary:
        if "workspace.edit" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        workspace = self.get_workspace(tenant, workspace_id)
        if payload.name is not None:
            workspace.name = payload.name
        if payload.description is not None:
            workspace.description = payload.description
        if payload.status is not None:
            workspace.status = payload.status
        saved = self.karag_manager.workspaces.update(tenant, workspace)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=WORKSPACE_UPDATED,
                tenant=tenant,
                resource_id=workspace.id,
                payload={"action": "workspace_updated"},
                workspace_id=workspace.id,
            )
        )
        outbox.flush(self.karag_manager.event_bus)
        return saved

    async def add_document(
        self,
        tenant: TenantContext,
        workspace_id: str,
        document_id: str,
        track_id: str | None = None,
    ) -> IngestionTrackerSummary:
        """Link a document to a workspace and trigger RAG ingestion."""
        if "workspace.edit" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        # 1. Validate same project
        doc = self.karag_manager.documents_repository.get(tenant.organization_id, tenant.project_id, document_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        self.ensure_workspace(tenant, workspace_id)

        # 2. Create DocumentWorkspaceLink (idempotent)
        if not self.karag_manager.doc_workspace_links.exists(document_id, workspace_id):
            self.karag_manager.doc_workspace_links.create(str(uuid4()), document_id, workspace_id)

        # 3. Create RAGDocument (status = pending)
        from app.rag.schemas.pipeline_models import RAGDocument
        from app.rag.schemas.types import FileStatus
        
        # Check if RAG record exists, if not create
        existing_rag = self.karag_manager.rag_documents_repository.get(document_id, workspace_id)
        if not existing_rag:
            rag_doc = RAGDocument(
                document_id=document_id,
                workspace_id=workspace_id,
                title=doc.title,
                status=FileStatus.PENDING,
            )
            self.karag_manager.rag_documents_repository.create(rag_doc)
        elif existing_rag.status == "completed":
            latest_job = self.karag_manager.ingestion_jobs_repository.latest_for_document(document_id, workspace_id)
            if latest_job:
                return IngestionTrackerSummary(**latest_job.model_dump())
            now = datetime.now(UTC)
            return IngestionTrackerSummary(
                job_id=track_id or document_id,
                document_id=document_id,
                workspace_id=workspace_id,
                track_id=track_id or document_id,
                status="completed",
                error_message=None,
                created_at=now,
                updated_at=now,
                completed_at=now,
            )
        else:
            self.karag_manager.rag_documents_repository.update_status(
                document_id,
                workspace_id,
                "pending",
                progress=0,
                error_message="",
            )

        self.karag_manager.documents_repository.update_status(
            tenant.organization_id,
            tenant.project_id,
            document_id,
            "queued",
        )

        # 4. Trigger async ingestion job
        from app.core.ports.message_broker import JobMessage
        from app.workers.job_types import DOCUMENT_INGEST
        job_id = str(uuid4())
        track_value = track_id or document_id
        job_summary = self.karag_manager.ingestion_jobs_repository.create(
            job_id=job_id,
            document_id=document_id,
            workspace_id=workspace_id,
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            track_id=track_value,
            status="queued",
        )

        storage_path = doc.storage_path
        job = JobMessage(
            job_type=DOCUMENT_INGEST,
            payload={
                "filename": doc.title,
                "content_path": storage_path,
                "extension": doc.extension,
                "project_id": tenant.project_id,
                "workspace_id": workspace_id,
                "document_id": document_id,
                "track_id": track_value,
                "upload_id": track_value,
            },
            job_id=job_id,
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=workspace_id,
            actor_id=tenant.actor_id,
        )
        await self.karag_manager.broker.publish(job)
        latest_job = self.karag_manager.ingestion_jobs_repository.get(job_id) or job_summary
        return IngestionTrackerSummary(**latest_job.model_dump())

    async def remove_document(self, tenant: TenantContext, workspace_id: str, document_id: str) -> None:
        """Unlink document from workspace and cleanup RAG state."""
        if "workspace.edit" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        self.ensure_workspace(tenant, workspace_id)
        setting = self.get_rag_config(tenant, workspace_id)
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

        try:
            await self.karag_manager.rag_manager.delete_document(document_id, context, setting)
        except Exception:
            logger.exception(
                "workspace.remove_document.vector_cleanup_failed workspace_id=%s document_id=%s",
                workspace_id,
                document_id,
            )

        # 1. delete DocumentWorkspaceLink
        self.karag_manager.doc_workspace_links.delete(document_id, workspace_id)

        # 2. delete RAGDocument
        self.karag_manager.rag_documents_repository.delete(document_id, workspace_id)

    def list_workspace_documents(self, tenant: TenantContext, workspace_id: str) -> list[Any]:
        """List all documents linked to this workspace with their ingestion status."""
        if "workspace.view" not in tenant.permissions or "doc.view" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        self.ensure_workspace(tenant, workspace_id)
        doc_ids = self.karag_manager.doc_workspace_links.list_by_workspace(workspace_id)
        docs = self.karag_manager.documents_repository.list_by_ids(tenant.organization_id, tenant.project_id, doc_ids)
        latest_jobs = self.karag_manager.ingestion_jobs_repository.latest_for_document_ids(doc_ids, workspace_id=workspace_id)
        
        # Enrich with status
        enriched = []
        for doc in docs:
            rag_record = self.karag_manager.rag_documents_repository.get(doc.id, workspace_id)
            doc_dict = doc.model_dump()
            latest_job = latest_jobs.get(doc.id)
            if rag_record:
                doc_dict["rag_status"] = rag_record.status
                doc_dict["rag_progress"] = rag_record.progress
                doc_dict["rag_error"] = rag_record.error_message
                doc_dict["rag_chunk_count"] = rag_record.chunk_count
            else:
                doc_dict["rag_status"] = "not_started"
            doc_dict["latest_ingestion"] = latest_job.model_dump() if latest_job else None
            doc_dict["status"] = latest_job.status if latest_job else doc_dict["rag_status"]
            doc_dict["workspace_count"] = 1
            enriched.append(doc_dict)
        return enriched

    def list_ingestions(self, tenant: TenantContext, workspace_id: str) -> list[IngestionTrackerSummary]:
        if "workspace.view" not in tenant.permissions or "doc.view" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        self.ensure_workspace(tenant, workspace_id)
        return [
            IngestionTrackerSummary(**job.model_dump())
            for job in self.karag_manager.ingestion_jobs_repository.list_for_workspace(workspace_id)
        ]

    async def ingest_from_project(
        self, tenant: TenantContext, workspace_id: str, document_ids: list[str]
    ) -> BulkIngestionResponse:
        """Backward compatibility: Link multiple documents from project to workspace."""
        if "workspace.edit" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        ingestions: list[IngestionTrackerSummary] = []
        for doc_id in document_ids:
            ingestions.append(await self.add_document(tenant, workspace_id, doc_id))
        return BulkIngestionResponse(status="started", ingestions=ingestions)
