from typing import Optional
from backend.app.core.mongodb import mongodb_manager
from backend.app.core.minio import minio_manager
from backend.app.core.exceptions import NotFoundError
from backend.app.rag.qdrant_provider import qdrant
from qdrant_client.http import models as qmodels
from .base import logger

class StorageService:
    async def get_content(self, doc_id: str) -> Optional[bytes]:
        """Retrieve file content from MinIO using internal document ID."""
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({"id": doc_id})
        if not doc:
            return None
        
        minio_path = doc.get("minio_path")
        if not minio_path:
            logger.error("missing_minio_path", doc_id=doc_id)
            return None
        
        return minio_manager.get_file(minio_path)

    async def delete(self, doc_id: str, workspace_id: str, vault_delete: bool = False):
        """Securely delete a document by its internal ID."""
        db = mongodb_manager.get_async_database()
        
        query = {"id": doc_id}
        if not (vault_delete and workspace_id == "vault"):
            query["$or"] = [
                {"workspace_id": workspace_id},
                {"shared_with": workspace_id}
            ]
            
        doc = await db.documents.find_one(query)
        if not doc: 
            raise NotFoundError(f"Document '{doc_id}' not found.")

        if vault_delete:
            # Check if this content is used elsewhere
            others = await db.documents.count_documents({
                "minio_path": doc["minio_path"], 
                "id": {"$ne": doc["id"]}
            })
            
            if others == 0:
                try:
                    minio_manager.delete_file(doc["minio_path"])
                except Exception as e:
                    logger.error("minio_delete_failed", error=str(e))
            
            # Cleanup all vector collections
            for dim in [384, 512, 768, 896, 1024, 1536, 1792, 3072]:
                coll = f"knowledge_base_{dim}"
                if await qdrant.client.collection_exists(coll):
                    await qdrant.client.delete(
                        collection_name=coll,
                        points_selector=qmodels.Filter(must=[
                            qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=doc["id"]))
                        ])
                    )

            await db.documents.delete_many({"id": doc["id"]})
        else:
            # Soft delete logic
            if doc["workspace_id"] == workspace_id:
                await db.documents.update_one({"id": doc["id"]}, {"$set": {"workspace_id": "vault"}})
            else:
                await db.documents.update_one({"id": doc["id"]}, {"$pull": {"shared_with": workspace_id}})
            
            coll = await qdrant.get_collection_name(workspace_id)
            if await qdrant.client.collection_exists(coll):
                await qdrant.client.delete(
                    collection_name=coll,
                    points_selector=qmodels.Filter(must=[
                        qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=doc["id"])),
                        qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=workspace_id))
                    ])
                )
    
    async def delete_many(self, workspace_id: str, delete_content: bool = False):
        """Batch delete all documents in a workspace."""
        db = mongodb_manager.get_async_database()

        if delete_content:
            cursor = db.documents.find({"workspace_id": workspace_id})
            docs = await cursor.to_list(1000)
            for doc in docs:
                await self.delete(doc["id"], workspace_id, vault_delete=True)

            await db.documents.update_many(
                {"shared_with": workspace_id},
                {"$pull": {"shared_with": workspace_id}}
            )
        else:
            await db.documents.update_many(
                {"workspace_id": workspace_id},
                {"$set": {"workspace_id": "vault"}}
            )
            await db.documents.update_many(
                {"shared_with": workspace_id},
                {"$pull": {"shared_with": workspace_id}}
            )
            
            coll = await qdrant.get_collection_name(workspace_id)
            if await qdrant.client.collection_exists(coll):
                await qdrant.client.delete(
                    collection_name=coll,
                    points_selector=qmodels.Filter(must=[
                        qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=workspace_id))
                    ])
                )
