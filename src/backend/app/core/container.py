from __future__ import annotations

from dataclasses import dataclass

from app.adapters import AnthropicLLMProvider, KafkaEventBus, MilvusVectorStore
from app.adapters import MinIOStorageProvider, NATSEventBus, OllamaEmbeddingProvider
from app.adapters import OllamaLLMProvider, OpenAIEmbeddingProvider, OpenAILLMProvider
from app.adapters import PineconeVectorStore, ProviderRegistry, QdrantVectorStore
from app.adapters import RedisStreamsEventBus, S3StorageProvider, VllmEmbeddingProvider
from app.adapters import VllmLLMProvider, WeaviateVectorStore
from app.core.config import PlatformSettings
from app.core.database import DatabaseManager
from app.core.observability import TelemetryStore
from app.modules.evaluation_datasets.repositories import EvaluationDatasetRepository
from app.modules.knowledge_datasets.repositories import ChunkRepository, DocumentRepository
from app.modules.knowledge_datasets.repositories import KnowledgeDatasetRepository
from app.modules.model_registry.repositories import ModelRegistryRepository
from app.modules.organizations.repositories import OrganizationRepository, ProjectRepository
from app.modules.workspaces.repositories import WorkspaceRagConfigRepository, WorkspaceRepository


@dataclass(slots=True)
class PlatformContainer:
    settings: PlatformSettings
    database: DatabaseManager
    telemetry: TelemetryStore
    vector_stores: ProviderRegistry
    storage_providers: ProviderRegistry
    event_buses: ProviderRegistry
    embedding_providers: ProviderRegistry
    llm_providers: ProviderRegistry
    organizations: OrganizationRepository
    projects: ProjectRepository
    workspaces: WorkspaceRepository
    workspace_rag_configs: WorkspaceRagConfigRepository
    knowledge_datasets: KnowledgeDatasetRepository
    documents: DocumentRepository
    chunks: ChunkRepository
    evaluation_datasets: EvaluationDatasetRepository
    models: ModelRegistryRepository

    @property
    def vector_store(self):
        return self.vector_stores.get()

    @property
    def storage_provider(self):
        return self.storage_providers.get()

    @property
    def event_bus(self):
        return self.event_buses.get()

    def health_report(self) -> dict[str, object]:
        counts = self.database.counts()
        return {
            "status": "ok",
            "providers": {
                "vector_store": self.vector_store.name,
                "storage_provider": self.storage_provider.name,
                "event_bus": self.event_bus.name,
                "embedding_provider": self.embedding_providers.default_name,
                "llm_provider": self.llm_providers.default_name,
            },
            "counts": {**counts, "events": len(self.event_bus.events())},
        }


def create_platform_container() -> PlatformContainer:
    settings = PlatformSettings()
    database = DatabaseManager(settings.database_url)
    database.initialize()
    telemetry = TelemetryStore(
        redact_by_default=settings.redact_llm_content,
        allowed_unredacted=settings.unredacted_workspace_ids,
    )
    vector_stores = ProviderRegistry(
        default_name=settings.default_vector_store,
        providers={
            "qdrant": QdrantVectorStore(
                url=settings.qdrant_url,
                api_key=settings.qdrant_api_key,
            ),
            "pinecone": PineconeVectorStore(),
            "weaviate": WeaviateVectorStore(),
            "milvus": MilvusVectorStore(),
        },
    )
    storage_providers = ProviderRegistry(
        default_name=settings.default_storage_provider,
        providers={
            "minio": MinIOStorageProvider(
                endpoint=settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                bucket=settings.minio_bucket,
                secure=settings.minio_secure,
            ),
            "s3": S3StorageProvider(
                bucket=settings.minio_bucket,
            ),
        },
    )
    event_buses = ProviderRegistry(
        default_name=settings.default_event_bus,
        providers={
            "redis-streams": RedisStreamsEventBus(
                redis_url=settings.redis_url,
                stream_name=settings.redis_stream_name,
            ),
            "nats": NATSEventBus(),
            "kafka": KafkaEventBus(),
        },
    )
    embedding_providers = ProviderRegistry(
        default_name=settings.default_embedding_provider,
        providers={
            "ollama": OllamaEmbeddingProvider(),
            "vllm": VllmEmbeddingProvider(),
            "openai": OpenAIEmbeddingProvider(),
        },
    )
    llm_providers = ProviderRegistry(
        default_name=settings.default_llm_provider,
        providers={
            "ollama": OllamaLLMProvider(),
            "vllm": VllmLLMProvider(),
            "openai": OpenAILLMProvider(),
            "anthropic": AnthropicLLMProvider(),
        },
    )
    container = PlatformContainer(
        settings=settings,
        database=database,
        telemetry=telemetry,
        vector_stores=vector_stores,
        storage_providers=storage_providers,
        event_buses=event_buses,
        embedding_providers=embedding_providers,
        llm_providers=llm_providers,
        organizations=OrganizationRepository(database),
        projects=ProjectRepository(database),
        workspaces=WorkspaceRepository(database),
        workspace_rag_configs=WorkspaceRagConfigRepository(database),
        knowledge_datasets=KnowledgeDatasetRepository(database),
        documents=DocumentRepository(database),
        chunks=ChunkRepository(database),
        evaluation_datasets=EvaluationDatasetRepository(database),
        models=ModelRegistryRepository(database),
    )
    container.event_bus.subscribe(
        "*",
        lambda event: container.telemetry.record_event(
            event.event_type,
            {
                "resource_id": event.resource_id,
                "organization_id": event.organization_id,
                "project_id": event.project_id,
                "workspace_id": event.workspace_id,
            },
        ),
    )
    return container
