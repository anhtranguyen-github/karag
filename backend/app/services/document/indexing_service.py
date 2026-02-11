import os
import tempfile
from backend.app.core.mongodb import mongodb_manager
from backend.app.core.minio import minio_manager
from backend.app.core.settings_manager import settings_manager
from backend.app.core.exceptions import NotFoundError
from backend.app.services.task_service import task_service
from backend.app.rag.ingestion import ingestion_pipeline
from backend.app.rag.qdrant_provider import qdrant
from qdrant_client.http import models as qmodels
from .base import logger

class IndexingService:
    async def index_document(self, doc_id_or_name: str, workspace_id: str, force: bool = False, task_id: str = None):
        """Phase 2: On-Demand Neural Indexing."""
        if task_id and await task_service.is_cancelled(task_id):
            logger.info("indexing_cancelled_start", task_id=task_id)
            return 0

        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({
            "$and": [
                {"$or": [{"id": doc_id_or_name}, {"filename": doc_id_or_name}]},
                {"$or": [{"workspace_id": workspace_id}, {"shared_with": workspace_id}]}
            ]
        })
        
        if not doc:
            raise NotFoundError(f"Document {doc_id_or_name} not found in workspace {workspace_id}")
            
        if doc["status"] == "indexed" and not force:
            return doc["chunks"]

        await db.documents.update_one({"id": doc["id"]}, {"$set": {"status": "indexing"}})
        
        try:
            if task_id and await task_service.is_cancelled(task_id):
                logger.info("indexing_cancelled_post_update", task_id=task_id)
                await db.documents.update_one({"id": doc["id"]}, {"$set": {"status": "uploaded"}})
                return 0

            settings = await settings_manager.get_settings(workspace_id)
            target_coll = qdrant.get_collection_name(settings.embedding_dim)
            if await qdrant.client.collection_exists(target_coll):
                await qdrant.client.delete(
                    collection_name=target_coll,
                    points_selector=qmodels.Filter(must=[
                        qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=doc["id"])),
                        qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=workspace_id))
                    ])
                )

            content = minio_manager.get_file(doc["minio_path"])
            if not content:
                raise ValueError("Source file missing in vault storage.")
                
            extension = doc.get("extension", ".tmp")
            with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            try:
                rag_hash = settings.get_rag_hash()
                
                if task_id and await task_service.is_cancelled(task_id):
                    logger.info("indexing_cancelled_before_pipeline", task_id=task_id)
                    await db.documents.update_one({"id": doc["id"]}, {"$set": {"status": "uploaded"}})
                    return 0

                await ingestion_pipeline.initialize(workspace_id=workspace_id)
                num_chunks = await ingestion_pipeline.process_file(
                    tmp_path, 
                    metadata={
                        "filename": doc["filename"], 
                        "workspace_id": workspace_id,
                        "doc_id": doc["id"], 
                        "version": doc.get("current_version", 1), 
                        "minio_path": doc["minio_path"],
                        "content_hash": doc["content_hash"],
                        "rag_config_hash": rag_hash
                    }
                )
                
                await db.documents.update_one(
                    {"id": doc["id"]}, 
                    {"$set": {"status": "indexed", "chunks": num_chunks, "rag_config_hash": rag_hash}}
                )
                logger.info("document_indexed_on_demand", filename=doc["filename"], chunks=num_chunks, force=force)
                return num_chunks
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                    
        except Exception as e:
            logger.error("indexing_failed", doc_id=doc["id"], error=str(e), exc_info=True)
            await db.documents.update_one({"id": doc["id"]}, {"$set": {"status": "uploaded"}})
            raise e

    async def run_index_background(self, task_id: str, doc_id_or_name: str, workspace_id: str, force: bool = False):
        """Background wrapper for index_document."""
        try:
            if await task_service.is_cancelled(task_id):
                return

            await task_service.update_task(task_id, status="processing", progress=10, message="Starting neural indexing...")
            num_chunks = await self.index_document(doc_id_or_name, workspace_id, force=force, task_id=task_id)
            
            if await task_service.is_cancelled(task_id):
                return

            await task_service.update_task(
                task_id, status="completed", progress=100,
                message=f"Indexed {num_chunks} fragments.",
                result={"chunks": num_chunks, "doc_id": doc_id_or_name, "workspace_id": workspace_id}
            )
        except Exception as e:
            logger.error("background_index_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.update_task(
                task_id, status="failed", message=str(e), error_code="INDEXING_FAILED"
            )
