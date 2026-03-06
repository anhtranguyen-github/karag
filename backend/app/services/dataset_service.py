"""
Dataset Service - Block 2: Data & Storage

Provides dataset-based knowledge storage for RAG.
A workspace can have multiple datasets.
"""

import secrets
from datetime import datetime
from typing import Literal

import structlog
from backend.app.core.exceptions import AuthorizationError, ConflictError, NotFoundError
from backend.app.core.mongodb import mongodb_manager
from backend.app.schemas.baas import FileStoreConfig, VectorStoreConfig
from backend.app.schemas.dataset import Dataset

logger = structlog.get_logger(__name__)


class DatasetService:
    """
    Service for dataset lifecycle and access management.

    ISOLATION PRINCIPLE:
    - Each workspace has its own isolated dataset(s)
    - Cross-workspace dataset access is blocked
    """

    DEFAULT_WORKSPACE_DATASET = "default"

    @classmethod
    async def create_workspace_dataset(
        cls, workspace_id: str, name: str, description: str | None = None
    ) -> Dataset:
        """Create a new workspace-scoped dataset."""
        db = mongodb_manager.get_async_database()

        # Validate workspace exists
        workspace = await db.workspaces.find_one({"id": workspace_id})
        if not workspace:
            raise NotFoundError(f"Workspace '{workspace_id}' not found")

        # Check for duplicate name
        existing = await db.datasets.find_one({"workspace_id": workspace_id, "name": name})
        if existing:
            raise ConflictError(f"Dataset with name '{name}' already exists in this workspace")

        dataset_id = f"dataset_{secrets.token_hex(8)}"

        # Create dataset
        dataset = Dataset(
            id=dataset_id,
            workspace_id=workspace_id,
            name=name,
            description=description,
            pipeline_id="default_pipeline",  # Can be customized later
            vector_store_config=VectorStoreConfig(
                collection_name=f"ws_{workspace_id}_dataset_{dataset_id}_kb",
                dimension=1536,
                distance_metric="cosine",
            ),
            file_store_config=FileStoreConfig(
                bucket="rag-docs", prefix=f"workspaces/{workspace_id}/datasets/{dataset_id}/"
            ),
        )

        await db.datasets.insert_one(dataset.model_dump())

        # Update workspace's dataset list
        await db.workspaces.update_one({"id": workspace_id}, {"$push": {"dataset_ids": dataset_id}})

        logger.info("dataset_created", dataset_id=dataset_id, workspace_id=workspace_id, name=name)

        return dataset

    @classmethod
    async def get_dataset(
        cls,
        dataset_id: str,
        workspace_id: str,
        required_permission: Literal["read", "write", "delete"] = "read",
    ) -> Dataset:
        """Get dataset with access control check."""
        db = mongodb_manager.get_async_database()

        dataset_doc = await db.datasets.find_one({"id": dataset_id, "is_active": True})
        if not dataset_doc:
            raise NotFoundError(f"Dataset '{dataset_id}' not found")

        dataset = Dataset(**dataset_doc)

        # ISOLATION CHECK
        if dataset.workspace_id != workspace_id:
            logger.warning(
                "cross_workspace_dataset_access_blocked",
                dataset_id=dataset_id,
                dataset_workspace=dataset.workspace_id,
                requesting_workspace=workspace_id,
            )
            raise AuthorizationError(
                f"Workspace '{workspace_id}' does not have access to dataset '{dataset_id}'"
            )

        return dataset

    @classmethod
    async def list_workspace_datasets(cls, workspace_id: str) -> list[Dataset]:
        """List all datasets accessible to a workspace."""
        db = mongodb_manager.get_async_database()

        datasets = []
        cursor = db.datasets.find({"workspace_id": workspace_id, "is_active": True})

        async for doc in cursor:
            datasets.append(Dataset(**doc))

        return datasets

    @classmethod
    async def get_or_create_default_dataset(cls, workspace_id: str) -> Dataset:
        """Get or create the default dataset for a workspace."""
        db = mongodb_manager.get_async_database()

        dataset = await db.datasets.find_one(
            {"workspace_id": workspace_id, "name": cls.DEFAULT_WORKSPACE_DATASET}
        )

        if dataset:
            return Dataset(**dataset)

        return await cls.create_workspace_dataset(
            workspace_id=workspace_id,
            name=cls.DEFAULT_WORKSPACE_DATASET,
            description="Default knowledge base for this workspace",
        )

    @classmethod
    async def delete_dataset(
        cls, dataset_id: str, workspace_id: str, delete_contents: bool = False
    ) -> bool:
        """Delete (deactivate) a dataset."""
        db = mongodb_manager.get_async_database()

        # Get dataset with access check
        await cls.get_dataset(dataset_id, workspace_id, "delete")

        if delete_contents:
            logger.warning(
                "dataset_delete_with_contents",
                dataset_id=dataset_id,
                workspace_id=workspace_id,
            )

        # Soft delete (deactivate)
        await db.datasets.update_one(
            {"id": dataset_id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
        )

        # Update workspace
        await db.workspaces.update_one({"id": workspace_id}, {"$pull": {"dataset_ids": dataset_id}})

        logger.info("dataset_deleted", dataset_id=dataset_id, workspace_id=workspace_id)

        return True

    @classmethod
    async def update_stats(
        cls,
        dataset_id: str,
        document_delta: int = 0,
        chunk_delta: int = 0,
        size_delta: int = 0,
    ) -> None:
        """Update dataset statistics."""
        db = mongodb_manager.get_async_database()

        await db.datasets.update_one(
            {"id": dataset_id},
            {
                "$inc": {
                    "document_count": document_delta,
                    "total_chunks": chunk_delta,
                    "total_size_bytes": size_delta,
                },
                "$set": {"updated_at": datetime.utcnow()},
            },
        )

    @classmethod
    def get_collection_name(cls, dataset: Dataset) -> str:
        """Get the vector store collection name for a dataset."""
        return dataset.vector_store_config.collection_name


# Singleton instance
dataset_service = DatasetService()
