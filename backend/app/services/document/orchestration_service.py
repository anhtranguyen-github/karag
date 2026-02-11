import uuid
from datetime import datetime
from backend.app.core.mongodb import mongodb_manager
from backend.app.core.settings_manager import settings_manager
from backend.app.core.exceptions import NotFoundError, ConflictError, ValidationError
from backend.app.services.task_service import task_service
from backend.app.rag.qdrant_provider import qdrant
from qdrant_client.http import models as qmodels
from .base import logger

class OrchestrationService:
    async def run_workspace_op_background(
        self, task_id: str, name: str, target_workspace_id: str,
        action: str, force_reindex: bool = False
    ):
        """Background wrapper for workspace operations."""
        try:
            if await task_service.is_cancelled(task_id):
                return 

            await task_service.update_task(
                task_id, status="processing", progress=10,
                message=f"Executing {action} operation..."
            )
            await self.update_workspaces(name, target_workspace_id, action, force_reindex=force_reindex, task_id=task_id)
            
            if await task_service.is_cancelled(task_id):
                return

            await task_service.update_task(
                task_id, status="completed", progress=100,
                message=f"Document {action} completed.",
                result={"document": name, "workspace": target_workspace_id, "action": action}
            )
        except Exception as e:
            logger.error("background_workspace_op_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.update_task(
                task_id, status="failed", message=str(e), error_code="WORKSPACE_OP_FAILED"
            )

    async def update_workspaces(self, name: str, target_workspace_id: str, action: str, force_reindex: bool = False, task_id: str = None):
        """Cross-workspace orchestration (move/share/link) with RAG Config auditing."""
        if task_id and await task_service.is_cancelled(task_id):
            return

        db = mongodb_manager.get_async_database()
        res = await db.documents.find_one({"filename": name})
        if not res:
            raise NotFoundError(f"Document '{name}' not found.")

        target_settings = await settings_manager.get_settings(target_workspace_id)
        target_rag_hash = target_settings.get_rag_hash()
        
        if action == "link":
            exists = await db.documents.find_one({"workspace_id": target_workspace_id, "content_hash": res["content_hash"]})
            if exists:
                return 
                
            new_id = str(uuid.uuid4())[:8]
            new_doc = res.copy()
            if "_id" in new_doc:
                del new_doc["_id"]
            new_doc["id"] = new_id
            new_doc["workspace_id"] = target_workspace_id
            new_doc["shared_with"] = []
            new_doc["status"] = "uploaded" 
            new_doc["rag_config_hash"] = target_rag_hash
            new_doc["created_at"] = datetime.utcnow().isoformat()
            new_doc["updated_at"] = new_doc["created_at"]
            
            await db.documents.insert_one(new_doc)
            await self.index_document(new_id, target_workspace_id, task_id=task_id)
            return

        is_config_compatible = res.get("rag_config_hash") == target_rag_hash
        
        if not is_config_compatible and not force_reindex:
            raise ConflictError(
                message=f"Incompatible Workspace: Target RAG config ({target_rag_hash}) differs from Document ({res.get('rag_config_hash')})",
                params={"type": "rag_mismatch", "expected": res.get("rag_config_hash"), "actual": target_rag_hash}
            )

        if force_reindex or (not is_config_compatible) or res["status"] != "indexed":
            await self.index_document(res["id"], target_workspace_id, force=(force_reindex or not is_config_compatible), task_id=task_id)
            res = await db.documents.find_one({"id": res["id"]})

        if action == "move":
            source_ws_id = res["workspace_id"]
            await db.documents.update_one({"id": res["id"]}, {"$set": {"workspace_id": target_workspace_id}})
            
            if source_ws_id != target_workspace_id:
                source_settings = await settings_manager.get_settings(source_ws_id)
                source_coll = qdrant.get_collection_name(source_settings.embedding_dim)
                if await qdrant.client.collection_exists(source_coll):
                    await qdrant.client.delete(
                        collection_name=source_coll,
                        points_selector=qmodels.Filter(must=[
                            qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=res["id"])),
                            qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=source_ws_id))
                        ])
                    )
        elif action == "share":
            await db.documents.update_one({"id": res["id"]}, {"$addToSet": {"shared_with": target_workspace_id}})
            updated_doc = await db.documents.find_one({"id": res["id"]})
            await qdrant.sync_shared_with(res["id"], updated_doc.get("shared_with", []))
        else:
            raise ValidationError(f"Invalid action: {action}")
