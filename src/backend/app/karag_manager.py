from __future__ import annotations

import logging
from typing import Any

# Core Infrastructure
from app.core.config import PlatformSettings
from app.core.database import DatabaseManager
from app.core.events import InMemoryEventBus, RedisStreamsEventBus
from app.core.observability import TelemetryStore
from app.core.ws_manager import WebsocketManager
from app.core.adapters.broker import InMemoryBroker, RedisBroker
from app.core.adapters.cache import InMemoryCache, RedisCache

# Services
from app.core.storage import MemoryStorageProvider, S3CompatibleStorageProvider

# Modules & Repositories
from app.modules.api_keys.repositories import ApiKeyRepository
from app.modules.organizations.repositories import OrganizationRepository, ProjectRepository
from app.modules.organizations.services import OrganizationService
from app.modules.workspaces.repositories import WorkspaceSettingRepository, WorkspaceRepository
from app.modules.auth.repositories import AuthRepository, RoleRepository, MembershipRepository
from app.modules.auth.services import AuthService
from app.modules.auth.access_service import AccessService
from app.modules.documents.repositories import DocumentRepository
from app.modules.documents.services import DocumentService
from app.modules.chat.repositories import ChatRepository
from app.modules.chat.services import ChatService
from app.modules.evaluation_datasets.repositories import EvaluationDatasetRepository
from app.modules.evaluation_datasets.services import EvaluationDatasetService
from app.core.rag.managers.rag_manager import RagManager
from app.core.rag.types import RagContext, RagExecutionResult, FileStatus
from app.core.rag.documents import Document
from app.core.rag.schemas import FileConfig
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

        self.telemetry = TelemetryStore(
            redact_by_default=settings.redact_llm_content,
            allowed_unredacted=settings.unredacted_workspace_ids,
        )

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
        self.chat_repository = ChatRepository(self.database)
        self.evaluation_datasets_repo = EvaluationDatasetRepository(self.database)

        # 3. Domain Managers & Services
        self.auth_service = AuthService(self)
        self.access_service = AccessService(self)
        self.organization_service = OrganizationService(self)
        self.document_service = DocumentService(self)
        self.chat_service = ChatService(self)
        self.evaluation_dataset_service = EvaluationDatasetService(self)
        # RagManager handles component management, ingestion, and retrieval.
        self.rag_manager = RagManager(settings=self.settings)
        self.ws_manager = WebsocketManager()

        # 4. Workers (consume from broker, reuse existing logic)
        self.ingestion_worker = IngestionWorker(self)
        self.ingestion_worker.register(self.broker)

        # Register default telemetry bridge
        self.event_bus.subscribe("*", self._telemetry_bridge)

        self.logger.info("KaragManager: Fully initialized and ready for orchestration.")

    # Backward-compatible alias
    @property
    def workspace_rag_configs(self):
        return self.workspace_settings

    def _telemetry_bridge(self, event):
        self.telemetry.record_event(
            event.event_type,
            {
                "resource_id": event.resource_id,
                "organization_id": event.organization_id,
                "project_id": event.project_id,
                "workspace_id": event.workspace_id,
            },
        )

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

    @property
    def observability(self):
        return self.telemetry

    def _resolve_workspace_setting(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSetting:
        """Load the workspace setting, creating a default if none exists."""
        setting = self.workspace_settings.get(tenant, workspace_id)
        if setting:
            return setting
        return WorkspaceSettingManager.build_default(workspace_id=workspace_id)

    def health_report(self) -> dict[str, Any]:
        """Verify systemic health of all foundation components."""
        counts = self.database.counts()
        return {
            "status": "ok",
            "infrastructure": {
                "storage": self.storage_provider.name,
                "event_bus": self.event_bus.name,
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

            from app.core.rag.utils import resolve_collection_name
            context = RagContext(
                organization_id=tenant.organization_id,
                project_id=tenant.project_id,
                workspace_id=workspace_id,
                dataset_id="default",
                collection_name=resolve_collection_name("default", setting.embedding.model),
                filters={"workspace_id": workspace_id},
                top_k=setting.retriever.top_k,
            )
            
            file_config = FileConfig(
                fileID=f"doc-{tenant.organization_id}-{filename}",
                filename=filename,
                isURL=False,
                overwrite=True,
                extension=extension or filename.split(".")[-1],
                source="storage",
                content=content,
                labels=[],
                rag_config={},
                file_size=len(content),
                status=FileStatus.PENDING,
                metadata="{}",
                status_report={}
            )
            
            return await self.rag_manager.import_document(setting, file_config, context)
        
        # Fallback if no RAG needed, just return a Document metadata object
        return [Document(
            title=filename,
            content="",
            extension=extension or filename.split(".")[-1],
            file_id=f"doc-{tenant.organization_id}-{filename}",
            source="storage"
        )]

    async def execute_rag_query(self, tenant: TenantContext, workspace_id: str, query: str, dataset_id: str) -> RagExecutionResult:
        setting = self._resolve_workspace_setting(tenant, workspace_id)

        from app.core.rag.utils import resolve_collection_name
        context = RagContext(
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=workspace_id,
            dataset_id=dataset_id,
            collection_name=resolve_collection_name("default", setting.embedding.model),
            filters={"workspace_id": workspace_id},
            top_k=setting.retriever.top_k,
        )
        return await self.rag_manager.retrieve(query, context, setting)

    # --- RUNTIME & UPLOADS ---

    def list_available_components(self) -> dict[str, list[str]]:
        """Registry discovery for all component types."""
        return {
            "generator": self.rag_manager.generators.available_components(),
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
