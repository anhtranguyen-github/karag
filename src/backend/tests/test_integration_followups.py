from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace

from app.core.ports.message_broker import JobMessage
from app.core.tenancy import TenantContext
from app.infra.db.database import DatabaseManager
from app.modules.documents.repositories import DocumentRepository
from app.modules.documents.schemas import DocumentCreate
from app.modules.documents.services import DocumentService
from app.modules.workspaces.repositories import (
    DocumentWorkspaceLinkRepository,
    IngestionJobRepository,
    RagDocumentRepository,
    WorkspaceRepository,
    WorkspaceSettingRepository,
)
from app.modules.workspaces.schemas import WorkspaceSummary
from app.modules.workspaces.services import WorkspaceService
from app.rag.schemas.pipeline_models import RAGDocument
from app.rag.schemas.types import FileStatus
from app.workers.ingestion_worker import IngestionWorker


class DummyStorage:
    def __init__(self, content: bytes | None = None, *, fail: bool = False) -> None:
        self.content = content or b""
        self.fail = fail
        self.deleted_prefixes: list[str] = []

    def get_object(self, path: str) -> bytes:
        if self.fail:
            raise FileNotFoundError(path)
        return self.content

    def store_object(self, path: str, content: bytes) -> None:
        self.content = content

    def delete_prefix(self, prefix: str) -> None:
        self.deleted_prefixes.append(prefix)


class DummyRagManager:
    def __init__(self) -> None:
        self.deleted: list[tuple[str, object, object]] = []

    async def delete_document(self, file_id: str, context: object, setting: object) -> None:
        self.deleted.append((file_id, context, setting))


class DummyNotify:
    def __init__(self) -> None:
        self.events: list[tuple[str, str, int, str | None]] = []

    async def __call__(self, upload_id: str, status: str, progress: int = 0, error: str | None = None) -> None:
        self.events.append((upload_id, status, progress, error))


def build_database() -> DatabaseManager:
    db = DatabaseManager("sqlite+pysqlite:///:memory:")
    db.initialize()
    return db


def test_ingestion_worker_marks_failed_job_and_rag_document() -> None:
    db = build_database()
    jobs = IngestionJobRepository(db)
    rag_docs = RagDocumentRepository(db)
    notify = DummyNotify()

    document_id = "doc-1"
    workspace_id = "ws-1"
    job_id = "job-1"
    track_id = "track-1"

    jobs.create(
        job_id=job_id,
        document_id=document_id,
        workspace_id=workspace_id,
        organization_id="org-1",
        project_id="prj-1",
        track_id=track_id,
    )
    rag_docs.create(
        RAGDocument(
            document_id=document_id,
            workspace_id=workspace_id,
            title="doc",
            status=FileStatus.PENDING,
        )
    )

    karag = SimpleNamespace(
        storage=DummyStorage(fail=True),
        ingestion_jobs_repository=jobs,
        rag_documents_repository=rag_docs,
        notify_upload_progress=notify,
    )
    worker = IngestionWorker(karag)

    import asyncio

    asyncio.run(
        worker.handle(
            JobMessage(
                job_type="document.ingest",
                payload={
                    "filename": "doc.txt",
                    "content_path": "/missing",
                    "workspace_id": workspace_id,
                    "document_id": document_id,
                    "track_id": track_id,
                },
                job_id=job_id,
                organization_id="org-1",
                project_id="prj-1",
                workspace_id=workspace_id,
                actor_id="user-1",
            )
        )
    )

    latest_job = jobs.get(job_id)
    rag_doc = rag_docs.get(document_id, workspace_id)

    assert latest_job is not None
    assert latest_job.status == "failed"
    assert rag_doc is not None
    assert rag_doc.status == "failed"
    assert notify.events[-1][1] == "failed"


def test_ingestion_worker_marks_completed_job() -> None:
    db = build_database()
    jobs = IngestionJobRepository(db)
    notify = DummyNotify()

    job_id = "job-2"
    jobs.create(
        job_id=job_id,
        document_id="doc-2",
        workspace_id="ws-2",
        organization_id="org-1",
        project_id="prj-1",
        track_id="track-2",
    )

    async def ingest_document(**_: object) -> None:
        return None

    karag = SimpleNamespace(
        storage=DummyStorage(content=b"hello"),
        ingestion_jobs_repository=jobs,
        rag_documents_repository=SimpleNamespace(update_status=lambda *args, **kwargs: None),
        notify_upload_progress=notify,
        ingest_document=ingest_document,
    )
    worker = IngestionWorker(karag)

    import asyncio

    asyncio.run(
        worker.handle(
            JobMessage(
                job_type="document.ingest",
                payload={
                    "filename": "doc.txt",
                    "content_path": "/ok",
                    "workspace_id": "ws-2",
                    "document_id": "doc-2",
                    "track_id": "track-2",
                },
                job_id=job_id,
                organization_id="org-1",
                project_id="prj-1",
                workspace_id="ws-2",
                actor_id="user-1",
            )
        )
    )

    latest_job = jobs.get(job_id)
    assert latest_job is not None
    assert latest_job.status == "completed"


def test_project_document_status_uses_latest_ingestion_and_workspace_count() -> None:
    db = build_database()
    documents = DocumentRepository(db)
    links = DocumentWorkspaceLinkRepository(db)
    jobs = IngestionJobRepository(db)

    doc = documents.create(
        DocumentCreate(
            project_id="prj-1",
            organization_id="org-1",
            title="doc.txt",
            extension="txt",
            file_size=4,
            storage_path="/tmp/doc.txt",
            status="uploaded",
        )
    )
    links.create("link-1", doc.id, "ws-1")
    jobs.create(
        job_id="job-3",
        document_id=doc.id,
        workspace_id="ws-1",
        organization_id="org-1",
        project_id="prj-1",
        track_id="track-3",
        status="completed",
    )

    service = DocumentService(
        SimpleNamespace(
            documents_repository=documents,
            doc_workspace_links=links,
            ingestion_jobs_repository=jobs,
        )
    )
    tenant = TenantContext(
        organization_id="org-1",
        project_id="prj-1",
        actor_id="user-1",
        permissions={"doc.view"},
    )

    result = service.list_documents(tenant, "prj-1")
    assert len(result) == 1
    assert result[0].status == "completed"
    assert result[0].workspace_count == 1
    assert result[0].latest_ingestion is not None
    assert result[0].latest_ingestion.job_id == "job-3"


def test_remove_document_cleans_vector_store_and_links() -> None:
    db = build_database()
    workspaces = WorkspaceRepository(db)
    workspace_settings = WorkspaceSettingRepository(db)
    links = DocumentWorkspaceLinkRepository(db)
    rag_docs = RagDocumentRepository(db)
    rag_manager = DummyRagManager()

    tenant = TenantContext(
        organization_id="org-1",
        project_id="prj-1",
        workspace_id="ws-1",
        actor_id="user-1",
        permissions={"workspace.edit", "workspace.view", "doc.view"},
    )
    workspaces.create(
        WorkspaceSummary(
            id="ws-1",
            organization_id="org-1",
            project_id="prj-1",
            name="Workspace",
            description=None,
            status="active",
            created_at=datetime.now(UTC),
        )
    )
    links.create("link-1", "doc-1", "ws-1")
    rag_docs.create(
        RAGDocument(
            document_id="doc-1",
            workspace_id="ws-1",
            title="doc",
            status=FileStatus.PENDING,
        )
    )

    service = WorkspaceService(
        SimpleNamespace(
            workspaces=workspaces,
            workspace_settings=workspace_settings,
            doc_workspace_links=links,
            rag_documents_repository=rag_docs,
            rag_manager=rag_manager,
        )
    )

    import asyncio

    asyncio.run(service.remove_document(tenant, "ws-1", "doc-1"))

    assert rag_manager.deleted
    assert not links.exists("doc-1", "ws-1")
    assert rag_docs.get("doc-1", "ws-1") is None


def test_delete_project_document_cleans_project_and_workspace_state() -> None:
    db = build_database()
    documents = DocumentRepository(db)
    links = DocumentWorkspaceLinkRepository(db)
    rag_docs = RagDocumentRepository(db)
    jobs = IngestionJobRepository(db)
    workspaces = WorkspaceRepository(db)
    workspace_settings = WorkspaceSettingRepository(db)
    rag_manager = DummyRagManager()
    storage = DummyStorage()

    tenant = TenantContext(
        organization_id="org-1",
        project_id="prj-1",
        actor_id="user-1",
        permissions={"doc.upload", "doc.view", "workspace.view"},
    )

    workspaces.create(
        WorkspaceSummary(
            id="ws-1",
            organization_id="org-1",
            project_id="prj-1",
            name="Workspace",
            description=None,
            status="active",
            created_at=datetime.now(UTC),
        )
    )

    doc = documents.create(
        DocumentCreate(
            project_id="prj-1",
            organization_id="org-1",
            title="doc.txt",
            extension="txt",
            file_size=4,
            storage_path="orgs/org-1/projects/prj-1/docs/doc.txt",
            status="uploaded",
        )
    )
    links.create("link-1", doc.id, "ws-1")
    rag_docs.create(
        RAGDocument(
            document_id=doc.id,
            workspace_id="ws-1",
            title="doc",
            status=FileStatus.PENDING,
        )
    )
    jobs.create(
        job_id="job-4",
        document_id=doc.id,
        workspace_id="ws-1",
        organization_id="org-1",
        project_id="prj-1",
        track_id="track-4",
    )

    service = DocumentService(
        SimpleNamespace(
            documents_repository=documents,
            doc_workspace_links=links,
            rag_documents_repository=rag_docs,
            ingestion_jobs_repository=jobs,
            workspace_service=WorkspaceService(
                SimpleNamespace(
                    workspaces=workspaces,
                    workspace_settings=workspace_settings,
                )
            ),
            rag_manager=rag_manager,
            storage=storage,
        )
    )

    import asyncio

    asyncio.run(service.delete_document(tenant, "prj-1", doc.id))

    assert documents.get("org-1", "prj-1", doc.id) is None
    assert links.list_by_document(doc.id) == []
    assert rag_docs.get(doc.id, "ws-1") is None
    assert jobs.latest_for_document(doc.id) is None
    assert storage.deleted_prefixes == ["orgs/org-1/projects/prj-1/docs/doc.txt"]
    assert rag_manager.deleted
