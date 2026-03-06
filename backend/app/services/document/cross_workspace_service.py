import uuid
from datetime import datetime

from backend.app.core.exceptions import NotFoundError, ValidationError
from backend.app.core.mongodb import mongodb_manager
from backend.app.services.document.base import logger
from backend.app.services.document.document_ingestion_service import document_ingestion_service
from backend.app.services.task.task_service import task_service


class CrossWorkspaceDocumentService:
    async def run_workspace_op_background(
        self,
        task_id: str,
        doc_id: str,
        target_workspace_id: str,
        action: str,
        force_reindex: bool = False,
    ):
        """Background wrapper for workspace operations."""
        try:
            if await task_service.is_cancelled(task_id):
                return

            await task_service.update_task(
                task_id,
                status="processing",
                progress=10,
                message=f"Executing {action} operation...",
            )
            await self.update_workspaces(
                doc_id,
                target_workspace_id,
                action,
                force_reindex=force_reindex,
                task_id=task_id,
            )

            if await task_service.is_cancelled(task_id):
                return

            await task_service.update_task(
                task_id,
                status="completed",
                progress=100,
                message=f"Document {action} completed.",
                result={
                    "document_id": doc_id,
                    "workspace": target_workspace_id,
                    "action": action,
                },
            )
        except Exception as e:
            logger.error(
                "background_workspace_op_failed",
                task_id=task_id,
                error=str(e),
                exc_info=True,
            )
            await task_service.update_task(
                task_id,
                status="failed",
                message=str(e),
                error_code="WORKSPACE_OP_FAILED",
            )

    async def update_workspaces(
        self,
        doc_id: str,
        target_workspace_id: str,
        action: str,
        force_reindex: bool = False,
        task_id: str = None,
    ):
        """Cross-workspace orchestration using internal doc_id."""
        if task_id and await task_service.is_cancelled(task_id):
            return

        db = mongodb_manager.get_async_database()
        res = await db.documents.find_one({"id": doc_id})
        if not res:
            raise NotFoundError(f"Document '{doc_id}' not found.")

        if action == "link":
            content_hash = res.get("content_hash")
            query = {"workspace_id": target_workspace_id}
            if content_hash:
                query["content_hash"] = content_hash
            else:
                query["id"] = res.get("id")

            exists = await db.documents.find_one(query)
            if exists:
                return

            new_id = str(uuid.uuid4())[:8]
            new_doc = res.copy()
            if "_id" in new_doc:
                del new_doc["_id"]
            new_doc["id"] = new_id
            new_doc["workspace_id"] = target_workspace_id
            new_doc["shared_with"] = []
            new_doc["status"] = "indexing"
            new_doc["workspace_statuses"] = {
                target_workspace_id: "indexing",
            }
            new_doc["chunks"] = 0
            new_doc["created_at"] = datetime.utcnow().isoformat()
            new_doc["updated_at"] = new_doc["created_at"]

            await db.documents.insert_one(new_doc)
            await document_ingestion_service.index_document(
                new_id, target_workspace_id, task_id=task_id
            )
            return

        # Always re-index if document is not in the target workspace's expected state
        # or if forced by the user. Moves/Shares across workspaces always trigger
        # independent indexing in this architecture.
        await document_ingestion_service.index_document(
            res["id"], target_workspace_id, force=force_reindex, task_id=task_id
        )
        res = await db.documents.find_one({"id": res["id"]})

        if action == "move":
            source_ws_id = res["workspace_id"]
            await db.documents.update_one(
                {"id": res["id"]}, {"$set": {"workspace_id": target_workspace_id}}
            )

            if source_ws_id != target_workspace_id:
                if task_id:
                    await task_service.update_task(
                        task_id, progress=90, message="Cleaning up source workspace..."
                    )
                from backend.app.rag.ingestion import ingestion_pipeline

                config, store = await ingestion_pipeline.get_ingestion_config(source_ws_id)
                await store.delete_document(config, res["id"])

        elif action == "share":
            await db.documents.update_one(
                {"id": res["id"]},
                {
                    "$addToSet": {"shared_with": target_workspace_id},
                    "$set": {
                        f"workspace_statuses.{target_workspace_id}": res.get("status", "uploaded")
                    },
                },
            )
            updated_doc = await db.documents.find_one({"id": res["id"]})

            from backend.app.rag.ingestion import ingestion_pipeline

            config, store = await ingestion_pipeline.get_ingestion_config(res["workspace_id"])
            await store.sync_shared_with(config, res["id"], updated_doc.get("shared_with", []))
        else:
            raise ValidationError(f"Invalid action: {action}")
