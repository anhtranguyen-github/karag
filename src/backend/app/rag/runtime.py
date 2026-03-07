from __future__ import annotations

from dataclasses import dataclass

import structlog
from src.backend.app.core.settings_manager import settings_manager
from src.backend.app.schemas.database import IngestionConfig

logger = structlog.get_logger(__name__)


@dataclass(slots=True)
class ResolvedRAGPipeline:
    workspace_id: str
    dataset_id: str | None
    pipeline_id: str | None
    chunking: object
    embedding: object
    retrieval: object
    reranker: object | None
    generation: object | None
    collection_name: str | None = None

    def to_ingestion_config(self) -> IngestionConfig:
        vector_size = getattr(self.embedding, "dimensions", None) or getattr(self.embedding, "dimension", 1536)
        return IngestionConfig(
            workspace_id=self.workspace_id,
            vector_size=vector_size,
            chunking=self.chunking,
            collection_name_override=self.collection_name,
        )


class RAGPipelineResolver:
    async def resolve(self, workspace_id: str, dataset_id: str | None = None) -> ResolvedRAGPipeline:
        settings = await settings_manager.get_settings(workspace_id)
        default_pipeline = ResolvedRAGPipeline(
            workspace_id=workspace_id,
            dataset_id=dataset_id,
            pipeline_id=None,
            chunking=settings.chunking,
            embedding=settings.embedding,
            retrieval=settings.retrieval,
            reranker=getattr(settings.retrieval, "rerank", None),
            generation=settings.generation,
            collection_name=None,
        )

        if not dataset_id:
            return default_pipeline

        from src.backend.app.services.dataset_service import dataset_service
        from src.backend.app.services.pipeline_service import pipeline_service

        try:
            dataset = await dataset_service.get_dataset(dataset_id, workspace_id)
            pipeline = await pipeline_service.get_pipeline(dataset.pipeline_id, workspace_id)
            return ResolvedRAGPipeline(
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                pipeline_id=pipeline.id,
                chunking=pipeline.chunking,
                embedding=pipeline.embedding,
                retrieval=pipeline.retrieval,
                reranker=pipeline.reranker,
                generation=pipeline.generation,
                collection_name=dataset.vector_store_config.collection_name,
            )
        except Exception as exc:
            logger.warning(
                "rag_pipeline_resolve_fallback",
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                error=str(exc),
            )
            return default_pipeline


rag_pipeline_resolver = RAGPipelineResolver()
