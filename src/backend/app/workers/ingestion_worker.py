"""Document ingestion worker — consumes DOCUMENT_INGEST jobs.

Reuses existing KaragManager.ingest_document() logic.
No business logic is duplicated here; this is purely orchestration.
"""
from __future__ import annotations

import logging

from app.core.logging import set_log_context, clear_log_context
from app.core.ports.message_broker import JobMessage, MessageBroker
from app.workers.job_types import DOCUMENT_INGEST

logger = logging.getLogger(__name__)


class IngestionWorker:
    """Handles async document ingestion jobs.

    Instantiated with a KaragManager reference so it can call
    the same ingestion pipeline used by the sync path.
    """

    def __init__(self, karag_manager: KaragManager) -> None:
        self._karag = karag_manager

    def register(self, broker: MessageBroker) -> None:
        """Subscribe this worker's handler to the broker."""
        broker.subscribe(DOCUMENT_INGEST, self.handle)

    async def handle(self, job: JobMessage) -> None:
        """Process a single document ingestion job.

        Expected payload keys:
            filename, content_path, extension, project_id, workspace_id
        """
        set_log_context(
            job_id=job.job_id,
            job_type=job.job_type,
            organization_id=job.organization_id,
            workspace_id=job.workspace_id,
        )
        logger.info("ingestion_worker.start filename=%s", job.payload.get("filename"))

        try:
            self._karag.ingestion_jobs_repository.update_status(job.job_id, status="processing")
            document_id = job.payload.get("document_id")
            if document_id:
                self._karag.documents_repository.update_status(
                    job.organization_id,
                    job.project_id,
                    document_id,
                    "processing",
                )
            from app.core.tenancy import TenantContext
            tenant = TenantContext(
                organization_id=job.organization_id,
                project_id=job.project_id,
                workspace_id=job.workspace_id,
                actor_id=job.actor_id,
            )

            # Retrieve file content from storage
            content_path = job.payload["content_path"]
            content = self._karag.storage.get_object(content_path)

            await self._karag.ingest_document(
                tenant=tenant,
                project_id=job.project_id,
                workspace_id=job.workspace_id,
                filename=job.payload["filename"],
                content=content,
                extension=job.payload.get("extension"),
                track_id=job.payload.get("track_id") or job.payload.get("upload_id"),
                document_id=job.payload.get("document_id"),
            )


            # Notify via websocket if upload_id provided
            upload_id = job.payload.get("track_id") or job.payload.get("upload_id")
            self._karag.ingestion_jobs_repository.update_status(job.job_id, status="completed")
            if document_id:
                self._karag.documents_repository.update_status(
                    job.organization_id,
                    job.project_id,
                    document_id,
                    "completed",
                )
            if upload_id:
                await self._karag.notify_upload_progress(upload_id, "completed", progress=100)

            logger.info("ingestion_worker.success job_id=%s", job.job_id)

        except Exception as exc:
            logger.exception("ingestion_worker.failed job_id=%s", job.job_id)
            self._karag.ingestion_jobs_repository.update_status(
                job.job_id,
                status="failed",
                error_message=str(exc),
            )
            document_id = job.payload.get("document_id")
            workspace_id = job.payload.get("workspace_id") or job.workspace_id
            if document_id:
                self._karag.documents_repository.update_status(
                    job.organization_id,
                    job.project_id,
                    document_id,
                    "failed",
                )
            if document_id and workspace_id:
                try:
                    self._karag.rag_documents_repository.update_status(
                        document_id,
                        workspace_id,
                        "failed",
                        progress=0,
                        error_message=str(exc),
                    )
                except Exception:
                    logger.exception(
                        "ingestion_worker.failed_status_update job_id=%s document_id=%s workspace_id=%s",
                        job.job_id,
                        document_id,
                        workspace_id,
                    )
            upload_id = job.payload.get("track_id") or job.payload.get("upload_id")
            if upload_id:
                try:
                    await self._karag.notify_upload_progress(upload_id, "failed", error=str(exc))
                except Exception:
                    pass
        finally:
            clear_log_context()
