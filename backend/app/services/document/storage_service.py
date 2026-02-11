from typing import Optional
from backend.app.core.mongodb import mongodb_manager
from backend.app.core.minio import minio_manager
from backend.app.core.settings_manager import settings_manager
from backend.app.core.exceptions import NotFoundError
from backend.app.rag.qdrant_provider import qdrant
from qdrant_client.http import models as qmodels
from .base import logger

class StorageService:
    async def get_content(self, name: str) -> Optional[bytes]:
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({
            "$or": [
                {"id": name},
                {"filename": name}
            ]
        })
        if not doc:
            return None
        
        return minio_manager.get_file(doc["minio_path"])

    async def delete(self, name: str, workspace_id: str, vault_delete: bool = False):
        db = mongodb_manager.get_async_database()
        if vault_delete and workspace_id == "vault":
            doc = await db.documents.find_one({"filename": name})
        else:
            doc = await db.documents.find_one({
                "filename": name,
                "$or": [
                    {"workspace_id": workspace_id},
                    {"shared_with": workspace_id}
                ]
            })
        if not doc: 
            raise NotFoundError(f"Document '{name}' not found in target context.")

        if vault_delete:
            others = await db.documents.count_documents({"minio_path": doc["minio_path"], "id": {"$ne": doc["id"]}})
            if others == 0:
                try:
                    minio_manager.delete_file(doc["minio_path"])
                except Exception as e:
                    logger.error("minio_delete_failed", error=str(e))
            
            for dim in [384, 512, 768, 896, 1024, 1536, 1792, 3072]:
                coll = f"knowledge_base_{dim}"
                if await qdrant.client.collection_exists(coll):
                    await qdrant.client.delete(
                        collection_name=coll,
                        points_selector=qmodels.Filter(must=[qmodels.FieldCondition(key="content_hash", match=qmodels.MatchValue(value=doc["content_hash"]))])
                    )

            await db.documents.delete_many({"minio_path": doc["minio_path"]})
        else:
            if doc["workspace_id"] == workspace_id:
                await db.documents.update_one({"id": doc["id"]}, {"$set": {"workspace_id": "vault"}})
            else:
                await db.documents.update_one({"id": doc["id"]}, {"$pull": {"shared_with": workspace_id}})
            
            target_settings = await settings_manager.get_settings(workspace_id)
            coll = qdrant.get_collection_name(target_settings.embedding_dim)
            if await qdrant.client.collection_exists(coll):
                await qdrant.client.delete(
                    collection_name=coll,
                    points_selector=qmodels.Filter(must=[
                        qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=doc["id"])),
                        qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=workspace_id))
                    ])
                )
    
    async def delete_many(self, workspace_id: str, delete_content: bool = False):
        """Batch delete documents associated with a workspace."""
        db = mongodb_manager.get_async_database()

        if delete_content:
            # Full deletion logic for owned documents
            cursor = db.documents.find({"workspace_id": workspace_id})
            docs = await cursor.to_list(1000)
            
            for doc in docs:
                await self.delete(doc["filename"], workspace_id, vault_delete=True)

            # Cleanup shared references where this workspace is a target
            await db.documents.update_many(
                {"shared_with": workspace_id},
                {"$pull": {"shared_with": workspace_id}}
            )
        else:
            # Soft delete logic: Move owned to vault, remove shared
            await db.documents.update_many(
                {"workspace_id": workspace_id},
                {"$set": {"workspace_id": "vault"}}
            )
            await db.documents.update_many(
                {"shared_with": workspace_id},
                {"$pull": {"shared_with": workspace_id}}
            )
            
            # Batch remove vector points
            target_settings = await settings_manager.get_settings(workspace_id)
            coll = qdrant.get_collection_name(target_settings.embedding_dim)
            if await qdrant.client.collection_exists(coll):
                await qdrant.client.delete(
                    collection_name=coll,
                    points_selector=qmodels.Filter(must=[
                        qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=workspace_id))
                    ])
                )
