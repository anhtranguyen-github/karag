from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

# Core Infrastructure
from app.core.config import PlatformSettings
from app.infra.db.database import DatabaseManager
from app.infra.db.database import RoleRow
from app.core.events import InMemoryEventBus, RedisStreamsEventBus
from app.realtime.websocket.ws_manager import WebsocketManager

# Infra Adapters
from app.infra.broker.broker import InMemoryBroker, RedisBroker
from app.infra.cache.cache import InMemoryCache, RedisCache

# Services / Storage
from app.infra.storage.storage import MemoryStorageProvider, S3CompatibleStorageProvider

# Modules & Repositories
from app.modules.api_keys.repositories import ApiKeyRepository
from app.modules.organizations.repositories import OrganizationRepository, ProjectRepository
from app.modules.organizations.services import OrganizationService
from app.modules.workspaces.repositories import (
    DocumentWorkspaceLinkRepository,
    IngestionJobRepository,
    RagDocumentRepository,
    WorkspaceSettingRepository,
    WorkspaceRepository,
)

from app.modules.auth.repositories import AuthRepository, RoleRepository, MembershipRepository
from app.modules.auth.service import AuthService
from app.modules.auth.access_service import AccessService
from app.modules.documents.repositories import DocumentRepository
from app.modules.documents.services import DocumentService
from app.modules.chat.repositories import ChatRepository
from app.modules.chat.services import ChatService
from app.rag.rag_manager import RagManager
from app.rag.managers.pipeline.ingestion_manager import IngestionManager
from app.rag.schemas.types import RagContext, RagExecutionResult, FileStatus
from app.rag.schemas.documents import Document
from app.rag.schemas.schemas import FileConfig
from app.core.tenancy import TenantContext
from app.modules.workspaces.schemas import WorkspaceSetting
from app.modules.workspaces.setting_manager import WorkspaceSettingManager
from app.workers.ingestion_worker import IngestionWorker


class KaragManager:
    """
    The 'KaragManager' and Dependency Hub of the Karag application.
    It manages all infrastructure, repositories, and orchestrates domain logic through specialty sub-managers.
    
    The Manager remains the single point of entry while delegating specialized execution to rag_manager.
    """

    def __init__(self, settings: PlatformSettings) -> None:
        self.settings = settings
        self.logger = logging.getLogger(__name__)

        # 1. Foundation (Core)
        self.database = DatabaseManager(settings.database_url)
        self.database.initialize()



        if settings.redis_url:
            self.event_bus = RedisStreamsEventBus(
                redis_url=settings.redis_url,
                stream_name=settings.redis_stream_name,
            )
        else:
            self.event_bus = InMemoryEventBus()

        if settings.minio_endpoint:
            self.storage_provider = S3CompatibleStorageProvider(
                name="minio",
                endpoint=settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                bucket=settings.minio_bucket,
                secure=settings.minio_secure,
            )
        else:
            self.storage_provider = MemoryStorageProvider()

        # Message broker (async job queue)
        if settings.redis_url:
            self.broker = RedisBroker(redis_url=settings.redis_url)
        else:
            self.broker = InMemoryBroker()

        # Cache
        if settings.redis_url:
            self.cache = RedisCache(redis_url=settings.redis_url)
        else:
            self.cache = InMemoryCache()

        # 2. Repositories
        self.organizations = OrganizationRepository(self.database)
        self.projects = ProjectRepository(self.database)
        self.workspaces = WorkspaceRepository(self.database)
        self.workspace_settings = WorkspaceSettingRepository(self.database)
        self.api_keys = ApiKeyRepository(self.database)
        self.auth_repository = AuthRepository(self.database)
        self.roles = RoleRepository(self.database)
        self.memberships = MembershipRepository(self.database)
        self.documents_repository = DocumentRepository(self.database)
        self.doc_workspace_links = DocumentWorkspaceLinkRepository(self.database)
        self.rag_documents_repository = RagDocumentRepository(self.database)
        self.ingestion_jobs_repository = IngestionJobRepository(self.database)
        self.chat_repository = ChatRepository(self.database)
        self._ensure_default_roles()


        # 3. Domain Managers & Services
        self.auth_service = AuthService(self)
        self.access_service = AccessService(self)
        self.organization_service = OrganizationService(self)
        from app.modules.workspaces.services import WorkspaceService
        self.workspace_service = WorkspaceService(self)
        self.document_service = DocumentService(self)
        self.chat_service = ChatService(self)
        # RagManager handles component management, ingestion, and retrieval.
        self.rag_manager = RagManager(settings=self.settings)
        self.ingestion_manager = IngestionManager(self.rag_manager)
        self.ws_manager = WebsocketManager()

        # 4. Workers (consume from broker, reuse existing logic)
        self.ingestion_worker = IngestionWorker(self)
        self.ingestion_worker.register(self.broker)



        self.logger.info("KaragManager: Fully initialized and ready for orchestration.")

    def _ensure_default_roles(self) -> None:
        existing = {name for name in ("admin", "member", "viewer") if self.roles.get_role_by_name(name)}
        missing = [
            ("admin", "Administrator with full organization and project access"),
            ("member", "Standard member with workspace and document access"),
            ("viewer", "Read-oriented member with limited access"),
        ]
        if len(existing) == len(missing):
            return
        with self.database.session() as session:
            for role_name, description in missing:
                if role_name in existing:
                    continue
                session.add(RoleRow(id=str(uuid4()), name=role_name, description=description))

    # Backward-compatible alias
    @property
    def workspace_rag_configs(self):
        return self.workspace_settings



    @classmethod
    def startup(cls) -> KaragManager:
        """Application startup entrypoint."""
        settings = PlatformSettings()
        return cls(settings)

    @property
    def events(self):
        return self.event_bus

    @property
    def storage(self):
        return self.storage_provider

    def _resolve_workspace_setting(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSetting:
        """Always return default settings for manual backend editing."""
        return WorkspaceSettingManager.build_default(workspace_id=workspace_id)

    def health_report(self) -> dict[str, Any]:
        """Verify systemic health of all foundation components."""
        counts = self.database.counts()
        
        # Resolve common default providers for reporting
        embedding_comp = self.settings.embedding_component
        llm_comp = self.settings.generator_component
        rerank_comp = self.settings.reranker_component
        vector_comp = self.settings.vectorstore_component

        return {
            "status": "ok",
            "providers": {
                "vector_store": vector_comp,
                "storage_provider": self.storage_provider.name,
                "event_bus": self.event_bus.name,
                "embedding_provider": embedding_comp,
                "llm_provider": llm_comp,
                "rerank_provider": rerank_comp,
            },
            "counts": {**counts, "events": len(self.event_bus.events())},
        }

    # --- Orchestration Endpoints ---

    async def check_health(self) -> dict[str, Any]:
        """High-level health check for the platform Boss."""
        return self.health_report()

    async def ingest_document(
        self, 
        tenant: TenantContext, 
        project_id: str, 
        workspace_id: str | None,
        filename: str,
        content: bytes,
        extension: str | None = None,
        setting: WorkspaceSetting | None = None,
        track_id: str | None = None,
        document_id: str | None = None,
    ) -> list[Document]:
        """
        Main ingestion entry point for the Karag platform.
        All RAG component config comes from the WorkspaceSetting.
        """
        # 1. Object Storage
        storage_path = f"orgs/{tenant.organization_id}/projects/{project_id}/docs/{filename}"
        self.storage.store_object(storage_path, content)
        
        # 2. RAG Ingestion (Optional based on workspace context)
        if workspace_id:
            if not setting:
                setting = self._resolve_workspace_setting(tenant, workspace_id)

            from app.rag.utils.utils import resolve_collection_name
            context = RagContext(
                organization_id=tenant.organization_id,
                project_id=tenant.project_id,
                workspace_id=workspace_id,
                dataset_id="default",
                collection_name=resolve_collection_name("default", setting.embedding.model),
                filters={"workspace_id": workspace_id},
                top_k=setting.retriever.top_k,
                metadata={
                    "project_id": project_id,
                    "workspace_id": workspace_id,
                    "filename": filename,
                }
            )
            
            file_config = FileConfig(
                fileID=document_id or f"doc-{tenant.organization_id}-{filename}",
                filename=filename,
                storage_path=storage_path,
                project_id=project_id,
                organization_id=tenant.organization_id,
                extension=extension or filename.split(".")[-1],
                source="storage",
                file_size=len(content),
                status=FileStatus.PENDING,
                mime_type="application/pdf" if filename.endswith(".pdf") else "application/octet-stream"
            )

            async def progress_callback(status: str, progress: int):
                if track_id:
                    await self.notify_upload_progress(track_id, status, progress)
                # PERSIST to RAGDocument status
                if document_id and workspace_id:
                    self.rag_documents_repository.update_status(
                        document_id, workspace_id, status, progress=progress
                    )
                if document_id:
                    document_status = "processing"
                    if status == "completed" or progress >= 100:
                        document_status = "completed"
                    elif status == "failed":
                        document_status = "failed"
                    self.documents_repository.update_status(
                        tenant.organization_id,
                        project_id,
                        document_id,
                        document_status,
                    )
            
            try:
                results = await self.rag_manager.import_document(
                    setting, file_config, content, context, on_progress=progress_callback
                )
                if document_id and workspace_id:
                    self.rag_documents_repository.update_status(
                        document_id, workspace_id, "completed", progress=100, chunk_count=len(results)
                    )
                if document_id:
                    self.documents_repository.update_status(
                        tenant.organization_id,
                        project_id,
                        document_id,
                        "completed",
                    )
                return results
            except Exception as e:
                self.logger.error("Ingestion failed for doc=%s workspace=%s: %s", document_id, workspace_id, e)
                if document_id and workspace_id:
                    self.rag_documents_repository.update_status(
                        document_id, workspace_id, "failed", error_message=str(e)
                    )
                if document_id:
                    self.documents_repository.update_status(
                        tenant.organization_id,
                        project_id,
                        document_id,
                        "failed",
                    )
                raise

        
        # Fallback if no RAG needed, just return a Document metadata object
        return [Document(
            title=filename,
            content="",
            extension=extension or filename.split(".")[-1],
            file_id=f"doc-{tenant.organization_id}-{filename}",
            source="storage"
        )]

    async def execute_rag_query(self, tenant: TenantContext, workspace_id: str, query: str, dataset_id: str, conversation_history: list[ChatMessage] | None = None) -> RagExecutionResult:
        setting = self._resolve_workspace_setting(tenant, workspace_id)

        from app.rag.utils.utils import resolve_collection_name
        context = RagContext(
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=workspace_id,
            dataset_id=dataset_id,
            collection_name=resolve_collection_name("default", setting.embedding.model),
            filters={"workspace_id": workspace_id},
            top_k=setting.retriever.top_k,
        )
        return await self.rag_manager.retrieve(query, context, setting, conversation_history=conversation_history)

    # --- RUNTIME & UPLOADS ---

    def list_available_components(self) -> dict[str, list[str]]:
        """Registry discovery for all component types."""
        return {
            "inference": self.rag_manager.inference.available_components(),
            "embedder": self.rag_manager.embedders.available_components(),
            "reranker": self.rag_manager.rerankers.available_components(),
            "vectorstore": self.rag_manager.vectorstores.available_components(),
            "reader": self.rag_manager.readers.available_components(),
            "chunker": self.rag_manager.chunkers.available_components(),
            "retriever": self.rag_manager.retrievers.available_components(),
            "query_transformer": self.rag_manager.query_transformers.available_components(),
            "chat_context": self.rag_manager.chat_context.available_components(),
        }

    async def notify_upload_progress(self, upload_id: str, status: str, progress: int = 0, error: str | None = None):
        """Orchestrate real-time progress updates."""
        import json
        payload = {"status": status, "progress": progress}
        if error:
            payload["error"] = error
        await self.ws_manager.notify(upload_id, json.dumps(payload))
