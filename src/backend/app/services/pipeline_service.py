"""
Pipeline Service - Block 4: Control Plane

Manages RAG pipeline configurations for workspaces and datasets.
"""

import secrets

import structlog
from src.backend.app.core.mongodb import mongodb_manager
from src.backend.app.schemas.pipeline import PipelineConfig

logger = structlog.get_logger(__name__)


class PipelineService:
    """
    Service for pipeline configuration lifecycle.
    """

    DEFAULT_PIPELINE_ID = "default_pipeline"

    @classmethod
    async def create_pipeline(cls, workspace_id: str, name: str, config_data: dict | None = None) -> PipelineConfig:
        """Create a new pipeline configuration."""
        db = mongodb_manager.get_async_database()

        pipeline_id = f"pipe_{secrets.token_hex(8)}"

        # Use default values if no config_data provided
        if config_data:
            pipeline = PipelineConfig(id=pipeline_id, workspace_id=workspace_id, name=name, **config_data)
        else:
            pipeline = PipelineConfig(id=pipeline_id, workspace_id=workspace_id, name=name)

        await db.pipelines.insert_one(pipeline.model_dump())
        logger.info("pipeline_created", pipeline_id=pipeline_id, workspace_id=workspace_id)
        return pipeline

    @classmethod
    async def get_pipeline(cls, pipeline_id: str, workspace_id: str) -> PipelineConfig:
        """Get pipeline with workspace isolation check."""
        db = mongodb_manager.get_async_database()

        if pipeline_id == cls.DEFAULT_PIPELINE_ID:
            # Return a default config if the specific one is missing
            # (In a real system we'd seed the DB with it)
            return PipelineConfig(id=cls.DEFAULT_PIPELINE_ID, workspace_id=workspace_id, name="Default Pipeline")

        pipeline_doc = await db.pipelines.find_one({"id": pipeline_id})
        if not pipeline_doc:
            # Fallback to default if not found (graceful degradation)
            return PipelineConfig(id=cls.DEFAULT_PIPELINE_ID, workspace_id=workspace_id, name="Default Pipeline")

        pipeline = PipelineConfig(**pipeline_doc)

        # Isolation check
        if pipeline.workspace_id != workspace_id:
            return PipelineConfig(id=cls.DEFAULT_PIPELINE_ID, workspace_id=workspace_id, name="Default Pipeline")

        return pipeline

    @classmethod
    async def list_workspace_pipelines(cls, workspace_id: str) -> list[PipelineConfig]:
        """List all pipeline configurations for a workspace."""
        db = mongodb_manager.get_async_database()
        pipelines = []
        cursor = db.pipelines.find({"workspace_id": workspace_id})
        async for doc in cursor:
            pipelines.append(PipelineConfig(**doc))
        return pipelines


pipeline_service = PipelineService()

