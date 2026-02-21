from typing import Optional
from backend.app.core.mongodb import mongodb_manager
from backend.app.core.minio import minio_manager
from backend.app.core.exceptions import NotFoundError
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
        if not vault_delete:
            query["$or"] = [
                {"workspace_id": workspace_id},
                {"shared_with": workspace_id},
            ]

        doc = await db.documents.find_one(query)
        if not doc:
            raise NotFoundError(f"Document '{doc_id}' not found.")

        from backend.app.core.factory import LangChainFactory
        store = await LangChainFactory.get_vector_store()

        if vault_delete:
            content_hash = doc.get("content_hash")
            minio_path = doc.get("minio_path")

            # Find all related document IDs sharing this content
            related_ids = [doc_id]
            if content_hash:
                cursor = db.documents.find({"content_hash": content_hash}, {"id": 1})
                related_docs = await cursor.to_list(1000)
                related_ids = list(set([r["id"] for r in related_docs] + [doc_id]))

            # 1. Cleanup MinIO file (if it exists)
            if minio_path:
                try:
                    minio_manager.delete_file(minio_path)
                except Exception as e:
                    logger.error("minio_delete_failed", error=str(e), doc_id=doc_id)

            # 2. Cleanup all vector collections for all related IDs
            await store.purge_documents(related_ids)

            # 3. Permanent wipe from MongoDB
            if content_hash:
                await db.documents.delete_many({"content_hash": content_hash})
            else:
                await db.documents.delete_many({"id": doc_id})
        else:
            # Soft delete logic
            doc_workspace = doc.get("workspace_id")
            if doc_workspace == workspace_id:
                await db.documents.update_one(
                    {"id": doc_id}, {"$set": {"workspace_id": "vault"}}
                )
            else:
                await db.documents.update_one(
                    {"id": doc_id}, {"$pull": {"shared_with": workspace_id}}
                )

            from backend.app.rag.ingestion import ingestion_pipeline
            config, store = await ingestion_pipeline.get_ingestion_config(workspace_id)
            await store.delete_document(config, doc.get("filename", doc_id))

    async def delete_many(self, workspace_id: str, delete_content: bool = False):
        """Batch delete all documents in a workspace."""
        db = mongodb_manager.get_async_database()

        if delete_content:
            cursor = db.documents.find({"workspace_id": workspace_id})
            docs = await cursor.to_list(1000)
            for doc in docs:
                await self.delete(doc["id"], workspace_id, vault_delete=True)

            await db.documents.update_many(
                {"shared_with": workspace_id}, {"$pull": {"shared_with": workspace_id}}
            )
        else:
            await db.documents.update_many(
                {"workspace_id": workspace_id}, {"$set": {"workspace_id": "vault"}}
            )
            await db.documents.update_many(
                {"shared_with": workspace_id}, {"$pull": {"shared_with": workspace_id}}
            )

            from backend.app.core.factory import LangChainFactory
            store = await LangChainFactory.get_vector_store()
            await store.purge_workspace(workspace_id)
