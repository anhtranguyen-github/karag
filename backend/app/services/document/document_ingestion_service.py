import os
from typing import Optional
from backend.app.core.mongodb import mongodb_manager
from backend.app.core.minio import minio_manager
from backend.app.core.exceptions import NotFoundError
from backend.app.services.task.task_service import task_service
from backend.app.rag.ingestion import ingestion_pipeline
from .base import logger


class DocumentIngestionService:
    async def index_document(
        self, doc_id: str, workspace_id: str, dataset_id: Optional[str] = None, force: bool = False, task_id: str = None
    ):
        """Phase 2: On-Demand Indexing."""
        if task_id and await task_service.is_cancelled(task_id):
            logger.info("indexing_cancelled_start", task_id=task_id)
            return 0

        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one(
            {
                "id": doc_id,
                "$or": [{"workspace_id": workspace_id}, {"shared_with": workspace_id}],
            }
        )

        if not doc:
            raise NotFoundError(
                f"Document {doc_id} not found in workspace {workspace_id}"
            )

        if (
            doc.get("workspace_statuses", {}).get(workspace_id) == "ingested"
            and not force
        ):
            return doc.get("chunks", 0)

        await db.documents.update_one(
            {"id": doc["id"]},
            {
                "$set": {
                    "status": "ingesting",
                    f"workspace_statuses.{workspace_id}": "ingesting",
                }
            },
        )

        try:
            if task_id and await task_service.is_cancelled(task_id):
                logger.info("indexing_cancelled_post_update", task_id=task_id)
                await db.documents.update_one(
                    {"id": doc["id"]},
                    {
                        "$set": {
                            "status": "uploaded",
                            f"workspace_statuses.{workspace_id}": "uploaded",
                        }
                    },
                )
                return 0

            config, store = await ingestion_pipeline.get_ingestion_config(workspace_id, dataset_id=dataset_id)

            # Phase 2a: Ensure collection and indices exist BEFORE operating on it
            # This prevents 400 errors from Qdrant when filtering on unindexed fields
            await ingestion_pipeline.initialize(workspace_id=workspace_id)

            # Use adapter to delete old indexes for this document (re-indexing case)
            # MongoDB doc_id is the source of truth for chunks
            await store.delete_document(config, doc_id)

            content = minio_manager.get_file(doc["minio_path"])
            if not content:
                raise ValueError("Source file missing in vault storage.")

            extension = doc.get("extension", ".tmp")
            from backend.app.core.path_utils import get_safe_temp_path

            tmp_path = str(get_safe_temp_path(suffix=extension))

            try:
                with open(tmp_path, "wb") as f:
                    f.write(content)

                try:
                    if task_id and await task_service.is_cancelled(task_id):
                        logger.info(
                            "indexing_cancelled_before_pipeline", task_id=task_id
                        )
                        await db.documents.update_one(
                            {"id": doc["id"]},
                            {
                                "$set": {
                                    "status": "uploaded",
                                    f"workspace_statuses.{workspace_id}": "uploaded",
                                }
                            },
                        )
                        return 0

                    from backend.app.core.path_utils import validate_safe_path

                    # Safety first: validate the temporary path
                    safe_tmp_path = validate_safe_path(tmp_path)

                    num_chunks = await ingestion_pipeline.process_file(
                        str(safe_tmp_path),
                        metadata={
                            "filename": doc["filename"],
                            "workspace_id": workspace_id,
                            "dataset_id": dataset_id,
                            "doc_id": doc["id"],
                            "version": doc.get("current_version", 1),
                            "minio_path": doc["minio_path"],
                            "content_hash": doc["content_hash"],
                            "task_id": task_id,
                        },
                        dataset_id=dataset_id
                    )

                    await db.documents.update_one(
                        {"id": doc["id"]},
                        {
                            "$set": {
                                "status": "ingested",
                                f"workspace_statuses.{workspace_id}": "ingested",
                                "chunks": num_chunks,
                            }
                        },
                    )
                    logger.info(
                        "document_indexed_on_demand",
                        filename=doc["filename"],
                        chunks=num_chunks,
                        force=force,
                    )
                    return num_chunks
                finally:
                    from backend.app.core.path_utils import validate_safe_path

                    try:
                        safe_cleanup_path = validate_safe_path(tmp_path)
                        if os.path.exists(safe_cleanup_path):
                            os.remove(safe_cleanup_path)
                    except Exception as e:
                        logger.warning("cleanup_failed", path=tmp_path, error=str(e))

            except Exception as e:
                logger.error(
                    "indexing_failed", doc_id=doc["id"], error=str(e), exc_info=True
                )
                await db.documents.update_one(
                    {"id": doc["id"]},
                    {
                        "$set": {
                            "status": "uploaded",
                            f"workspace_statuses.{workspace_id}": "uploaded",
                        }
                    },
                )
                raise e
        except Exception as e:
            logger.error("indexing_outer_error", doc_id=doc_id, error=str(e))
            raise e

    async def run_index_background(
        self, task_id: str, doc_id: str, workspace_id: str, dataset_id: Optional[str] = None, force: bool = False
    ):
        """Background wrapper for index_document."""
        try:
            if await task_service.is_cancelled(task_id):
                return

            await task_service.update_task(
                task_id,
                status="processing",
                progress=10,
                message="Starting indexing...",
            )
            num_chunks = await self.index_document(
                doc_id, workspace_id, dataset_id=dataset_id, force=force, task_id=task_id
            )

            if await task_service.is_cancelled(task_id):
                return

            await task_service.update_task(
                task_id,
                status="completed",
                progress=100,
                message=f"Indexed {num_chunks} chunks.",
                result={
                    "chunks": num_chunks,
                    "doc_id": doc_id,
                    "workspace_id": workspace_id,
                },
            )
        except Exception as e:
            logger.error(
                "background_index_failed", task_id=task_id, error=str(e), exc_info=True
            )
            await task_service.fail_with_retry(
                task_id, error_message=str(e), error_code="INDEXING_FAILED"
            )


document_ingestion_service = DocumentIngestionService()
