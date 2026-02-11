import os
import tempfile
import hashlib
import uuid
import io
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from fastapi import UploadFile
import re

import structlog
from backend.app.rag.ingestion import ingestion_pipeline
from backend.app.rag.qdrant_provider import qdrant
from qdrant_client.http import models as qmodels
from backend.app.core.minio import minio_manager
from backend.app.core.mongodb import mongodb_manager
from backend.app.services.task_service import task_service
from backend.app.core.settings_manager import settings_manager
from backend.app.core.exceptions import ValidationError, ConflictError, NotFoundError
from backend.app.core.telemetry import get_tracer, DOCUMENT_INGESTION_COUNT

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)

class DocumentService:
    @staticmethod
    async def upload(file: UploadFile, workspace_id: str) -> Tuple[str, bytes, str, str, Dict]:
        """Process and ingest a new document with background task tracking."""
        with tracer.start_as_current_span(
            "document.upload",
            attributes={"workspace_id": workspace_id},
        ) as span:
            db = mongodb_manager.get_async_database()
            
            # 1. Filename validation
            from backend.app.core.constants import ILLEGAL_NAME_CHARS
            original_filename = file.filename or "unnamed_file"
            found_chars = [c for c in ILLEGAL_NAME_CHARS if c in original_filename]
            if found_chars:
                raise ValidationError(
                    message=f"Filename contains illegal characters: {' '.join(found_chars)}. Please remove them and try again.",
                    params={"illegal": found_chars}
                )

            content = await file.read()
            file_size = len(content)
            file_type = file.content_type
            file_hash = hashlib.sha256(content).hexdigest()
            
            # 2. Global Deduplication Check
            existing_vault_doc = await db.documents.find_one({"content_hash": file_hash})
            
            # Check for local name duplicate
            existing_local = await db.documents.find_one({"workspace_id": workspace_id, "filename": original_filename})
            if existing_local:
                raise ConflictError(f"Document '{original_filename}' already exists in this workspace.")

            duplicate_info = {}
            if existing_vault_doc:
                duplicate_info = {
                    "is_duplicate": True,
                    "existing_id": existing_vault_doc["id"],
                    "existing_name": existing_vault_doc["filename"],
                    "original_workspace": existing_vault_doc["workspace_id"]
                }
                logger.info("global_duplicate_detected", filename=original_filename, existing_id=existing_vault_doc["id"])

            # Sanitize filename for internal storage safety
            safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', original_filename)
                
            # Create Task
            task_id = await task_service.create_task("ingestion", {
                "filename": original_filename,
                "safe_filename": safe_filename,
                "workspace_id": workspace_id,
                "size": file_size,
                "content_hash": file_hash
            })

            span.set_attribute("document.filename", original_filename)
            span.set_attribute("document.size_bytes", file_size)
            logger.info(
                "document_upload_accepted",
                filename=original_filename,
                size_bytes=file_size,
                workspace_id=workspace_id,
                task_id=task_id,
                is_duplicate=bool(duplicate_info)
            )
            
            return task_id, content, original_filename, file_type, duplicate_info

    @staticmethod
    async def upload_arxiv(arxiv_id_or_url: str, workspace_id: str) -> Tuple[str, bytes, str, str]:
        """Download a paper from arXiv and prepare it for ingestion."""
        with tracer.start_as_current_span(
            "document.upload_arxiv",
            attributes={"workspace_id": workspace_id, "arxiv_id_or_url": arxiv_id_or_url},
        ):
            import arxiv
            
            # 1. Extract arXiv ID
            arxiv_id = arxiv_id_or_url.split('/')[-1]
            if arxiv_id.endswith('.pdf'):
                arxiv_id = arxiv_id.replace('.pdf', '')
            
            try:
                # 2. Search for the paper
                search = arxiv.Search(id_list=[arxiv_id])
                paper = next(search.results())
                
                # 3. Validation and Filename Clean
                title = paper.title
                from backend.app.core.constants import ILLEGAL_NAME_CHARS
                safe_title = re.sub(r'[\\/*?:"<>|]', "", title).replace(" ", "_").strip(".")
                filename = f"{safe_title}.pdf"
                
                found_chars = [c for c in ILLEGAL_NAME_CHARS if c in filename]
                if found_chars:
                    # If still has illegal chars, fallback to a safer version
                    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)

                # 4. Check for duplicates in this workspace
                db = mongodb_manager.get_async_database()
                existing_doc = await db.documents.find_one({"workspace_id": workspace_id, "filename": filename})
                if existing_doc:
                    raise ConflictError(f"Document '{filename}' already exists in this workspace.")

                # 5. Download the PDF into memory
                # Create a temporary file to download to
                with tempfile.TemporaryDirectory() as tmp_dir:
                    paper.download_pdf(dirpath=tmp_dir, filename=filename)
                    pdf_path = os.path.join(tmp_dir, filename)
                    with open(pdf_path, "rb") as f:
                        content = f.read()
                
                file_size = len(content)
                content_type = "application/pdf"
                file_hash = hashlib.sha256(content).hexdigest()
                
                # 6. Global Deduplication Check
                existing_vault_doc = await db.documents.find_one({"content_hash": file_hash})
                duplicate_info = {}
                if existing_vault_doc:
                    duplicate_info = {
                        "is_duplicate": True,
                        "existing_id": existing_vault_doc["id"],
                        "existing_name": existing_vault_doc["filename"],
                        "original_workspace": existing_vault_doc["workspace_id"]
                    }
                    logger.info("global_duplicate_detected_arxiv", filename=filename, arxiv_id=arxiv_id)

                # 7. Create Task
                task_id = await task_service.create_task("ingestion", {
                    "filename": filename,
                    "safe_filename": filename,
                    "workspace_id": workspace_id,
                    "size": file_size,
                    "source": "arxiv",
                    "arxiv_id": arxiv_id,
                    "content_hash": file_hash
                })

                logger.info(
                    "document_arxiv_download_complete",
                    filename=filename,
                    arxiv_id=arxiv_id,
                    workspace_id=workspace_id,
                    task_id=task_id,
                    is_duplicate=bool(duplicate_info)
                )
                
                return task_id, content, filename, content_type, duplicate_info

            except Exception as e:
                logger.error("arxiv_download_failed", arxiv_id=arxiv_id, error=str(e))
                if isinstance(e, ConflictError):
                    raise e
                raise ValidationError(f"Failed to download arXiv paper: {str(e)}")

    async def run_ingestion(self, task_id: str, safe_filename: str, content: bytes, content_type: str, workspace_id: str):
        """Phase 1: Neutral Storage. Only stores in MinIO and records in MongoDB."""
        db = mongodb_manager.get_async_database()
        doc_id = None
        try:
            if await task_service.is_cancelled(task_id):
                logger.info("ingestion_cancelled_start", task_id=task_id)
                return

            await task_service.update_task(task_id, status="processing", progress=20, message="Calculating signatures...")
            file_hash = hashlib.sha256(content).hexdigest()
            file_size = len(content)
            
            # 1. GLOBAL VAULT DEDUPLICATION CHECK
            existing_vault_doc = await db.documents.find_one({"content_hash": file_hash})
            
            if await task_service.is_cancelled(task_id):
                logger.info("ingestion_cancelled_mid", task_id=task_id)
                return

            # 2. LOCAL WORKSPACE COLLISION CHECK (Avoid double entries in same WS)
            existing_local_doc = await db.documents.find_one({"workspace_id": workspace_id, "content_hash": file_hash})
            if existing_local_doc:
                await task_service.update_task(task_id, status="completed", progress=100, message="Document already exists in this workspace. Reusing index.")
                logger.info("ingestion_skipped_local_duplicate", filename=safe_filename, workspace_id=workspace_id)
                return

            doc_id = str(uuid.uuid4())[:8]
            extension = os.path.splitext(safe_filename)[1].lower()
            version = 1
            timestamp = datetime.utcnow().isoformat()
            
            # Use current settings for traceability, even if not indexing yet
            settings = await settings_manager.get_settings(workspace_id)
            rag_hash = settings.get_rag_hash()

            if existing_vault_doc:
                # REUSE PHYSICAL STORAGE
                minio_path = existing_vault_doc["minio_path"]
                await task_service.update_task(task_id, progress=60, message="Linking to existing vault record...")
            else:
                # NEW PHYSICAL UPLOAD
                minio_path = f"vault/{doc_id}/v{version}/{safe_filename}"
                await task_service.update_task(task_id, progress=60, message="Storing in neutral vault...")
                
                if await task_service.is_cancelled(task_id):
                    logger.info("ingestion_cancelled_before_upload", task_id=task_id)
                    return

                await minio_manager.upload_file(minio_path, io.BytesIO(content), file_size, content_type=content_type)

            # Create MongoDB record (Status is 'uploaded', NOT 'indexed')
            doc_record = {
                "id": doc_id, 
                "workspace_id": workspace_id, 
                "filename": safe_filename,
                "extension": extension, 
                "minio_path": minio_path, 
                "status": "uploaded", # Neutral state
                "current_version": version, 
                "content_hash": file_hash, 
                "size_bytes": file_size,
                "chunks": 0, 
                "created_at": timestamp, 
                "updated_at": timestamp, 
                "shared_with": [],
                "rag_config_hash": rag_hash 
            }
            
            if await task_service.is_cancelled(task_id):
                # Cleanup if we just uploaded
                if not existing_vault_doc:
                     minio_manager.delete_file(minio_path)
                logger.info("ingestion_cancelled_final", task_id=task_id)
                return

            await db.documents.insert_one(doc_record)
            
            await task_service.update_task(task_id, status="completed", progress=100, message="Stored in Intelligence Vault.")
            logger.info("document_vault_stored", filename=safe_filename, doc_id=doc_id, workspace_id=workspace_id)

        except Exception as e:
            logger.error("vault_storage_failed", filename=safe_filename, error=str(e), exc_info=True)
            error_msg = str(e)
            error_code = "INTERNAL_ERROR"
            if "illegal" in error_msg.lower():
                error_code = "ILLEGAL_PATH"
            
            await task_service.update_task(task_id, status="failed", message=error_msg, error_code=error_code)
            if doc_id:
                await db.documents.update_one({"id": doc_id}, {"$set": {"status": "failed"}})

    async def index_document(self, doc_id_or_name: str, workspace_id: str, force: bool = False, task_id: str = None):
        """Phase 2: On-Demand Neural Indexing. Triggered by explicit interaction."""
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
            # Already done
            return doc["chunks"]

        # 1. Update status
        await db.documents.update_one({"id": doc["id"]}, {"$set": {"status": "indexing"}})
        
        try:
            if task_id and await task_service.is_cancelled(task_id):
                logger.info("indexing_cancelled_post_update", task_id=task_id)
                # Revert status
                await db.documents.update_one({"id": doc["id"]}, {"$set": {"status": "uploaded"}})
                return 0

            # 2. Cleanup old points for this doc in THIS workspace if re-indexing
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

            # 3. Get file content from MinIO
            content = minio_manager.get_file(doc["minio_path"])
            if not content:
                raise ValueError("Source file missing in vault storage.")
                
            # 4. Save to temp file for ingestion loaders
            extension = doc.get("extension", ".tmp")
            with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            try:
                # 5. Run RAG Pipeline
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
                
                # 6. Finalize
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
            await db.documents.update_one({"id": doc["id"]}, {"$set": {"status": "uploaded"}}) # Revert to neutral
            raise e

    async def run_index_background(self, task_id: str, doc_id_or_name: str, workspace_id: str, force: bool = False):
        """Background wrapper for index_document that updates task progress."""
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

    async def run_workspace_op_background(
        self, task_id: str, name: str, target_workspace_id: str,
        action: str, force_reindex: bool = False
    ):
        """Background wrapper for update_workspaces that updates task progress."""
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
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({"filename": name})
        if not doc:
            raise NotFoundError(f"Document '{name}' not found.")

        if action == "share":
            if target_workspace_id in doc.get("shared_with", []):
                raise ConflictError(f"Document '{name}' already shared with workspace '{target_workspace_id}'.")
            
            await db.documents.update_one(
                {"_id": doc["_id"]},
                {"$addToSet": {"shared_with": target_workspace_id}}
            )
            logger.info("document_shared", filename=name, target_workspace_id=target_workspace_id)
            
            # Trigger indexing in the target workspace if not already indexed
            await self.index_document(doc["id"], target_workspace_id, force=force_reindex, task_id=task_id)

        elif action == "unshare":
            if target_workspace_id not in doc.get("shared_with", []):
                raise NotFoundError(f"Document '{name}' is not shared with workspace '{target_workspace_id}'.")
            
            await db.documents.update_one(
                {"_id": doc["_id"]},
                {"$pull": {"shared_with": target_workspace_id}}
            )
            logger.info("document_unshared", filename=name, target_workspace_id=target_workspace_id)

            # Clean up vector store entries for this specific workspace
            target_settings = await settings_manager.get_settings(target_workspace_id)
            coll = qdrant.get_collection_name(target_settings.embedding_dim)
            if await qdrant.client.collection_exists(coll):
                await qdrant.client.delete(
                    collection_name=coll,
                    points_selector=qmodels.Filter(must=[
                        qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=doc["id"])),
                        qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=target_workspace_id))
                    ])
                )
        else:
            raise ValidationError(f"Invalid action: {action}")

    @staticmethod
    async def list_by_workspace(workspace_id: str) -> List[Dict]:
        db = mongodb_manager.get_async_database()
        cursor = db.documents.find({
            "$or": [
                {"workspace_id": workspace_id},
                {"shared_with": workspace_id}
            ]
        })
        all_docs = await cursor.to_list(length=200)
        for d in all_docs:
            if d.get("shared_with") and workspace_id in d["shared_with"]:
                d["is_shared"] = True
            if "_id" in d:
                d["_id"] = str(d["_id"])
            d["name"] = d.get("filename")
        return all_docs

    @staticmethod
    async def list_all() -> List[Dict]:
        db = mongodb_manager.get_async_database()
        cursor = db.documents.find()
        docs = await cursor.to_list(length=1000)
        
        # Get all workspaces to map IDs to Names
        ws_cursor = db.workspaces.find({}, {"id": 1, "name": 1})
        workspaces = await ws_cursor.to_list(length=1000)
        ws_map = {ws.get("id", ""): ws.get("name", "Unknown") for ws in workspaces if ws.get("id")}
        
        for d in docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
            d["name"] = d.get("filename")
            d["workspace_name"] = ws_map.get(d.get("workspace_id", ""), "Unknown Workspace")
        return docs

    @staticmethod
    async def list_vault() -> List[Dict]:
        """Returns unique documents in the vault, deduped by content_hash."""
        db = mongodb_manager.get_async_database()
        pipeline = [
            {"$sort": {"updated_at": -1}},
            {
                "$group": {
                    "_id": "$content_hash",
                    "doc": {"$first": "$$ROOT"}
                }
            },
            {"$replaceRoot": {"newRoot": "$doc"}}
        ]
        cursor = db.documents.aggregate(pipeline)
        docs = await cursor.to_list(length=1000)
        
        ws_cursor = db.workspaces.find({}, {"id": 1, "name": 1})
        workspaces = await ws_cursor.to_list(length=1000)
        ws_map = {ws.get("id", ""): ws.get("name", "Unknown") for ws in workspaces if ws.get("id")}

        for d in docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
            d["name"] = d.get("filename")
            d["workspace_name"] = ws_map.get(d.get("workspace_id", ""), "Unknown Workspace")
        return docs

    @staticmethod
    async def get_by_id_or_name(name: str) -> Optional[Dict]:
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({
            "$or": [
                {"id": name},
                {"filename": name}
            ]
        })
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def get_content(self, name: str) -> Optional[str]:
        db = mongodb_manager.get_async_database()
        # Try finding by ID first, then by filename
        doc = await db.documents.find_one({
            "$or": [
                {"id": name},
                {"filename": name}
            ]
        })
        if not doc:
            return None
            
        workspace_id = doc.get("workspace_id")
        
        # Explicit Interaction: Trigger indexing if not indexed
        if doc["status"] != "indexed":
            try:
                await self.index_document(doc["id"], workspace_id)
            except Exception as e:
                logger.error("auto_index_on_view_failed", error=str(e))
                # Fallback to MinIO raw read (best effort)
                raw_data = minio_manager.get_file(doc["minio_path"])
                if raw_data:
                    try:
                        return raw_data.decode('utf-8')
                    except:
                        return f"[REDACTED BINARY DATA: {doc['extension']}]"
                return None

        return await qdrant.get_document_content("knowledge_base", doc["filename"], workspace_id=workspace_id)

    @staticmethod
    async def delete(name: str, workspace_id: str, vault_delete: bool = False):
        db = mongodb_manager.get_async_database()
        # Find document by name (could be owner or shared)
        # For vault delete from 'vault' workspace, find by filename globally
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
            # GLOBAL DELETE: Purge everything
            # 1. MinIO removal (check if shared by physical file path)
            others = await db.documents.count_documents({"minio_path": doc["minio_path"], "id": {"$ne": doc["id"]}})
            if others == 0:
                try:
                    minio_manager.delete_file(doc["minio_path"])
                except Exception as e:
                    logger.error("minio_delete_failed", error=str(e))
            
            # 2. Vector Store removal: Attempt to delete from all potential dimension collections
            # (Proactive: cover all known model outputs to prevent stale data hallucinations)
            for dim in [384, 512, 768, 896, 1024, 1536, 1792, 3072]:
                coll = f"knowledge_base_{dim}"
                if await qdrant.client.collection_exists(coll):
                    await qdrant.client.delete(
                        collection_name=coll,
                        points_selector=qmodels.Filter(must=[qmodels.FieldCondition(key="content_hash", match=qmodels.MatchValue(value=doc["content_hash"]))])
                    )

            # 3. Database removal: Delete ALL records sharing this file path
            await db.documents.delete_many({"minio_path": doc["minio_path"]})
        else:
            # LOCAL REMOVAL: Remove association from this workspace only
            if doc["workspace_id"] == workspace_id:
                # Owner is removing. Unassign to 'vault' (system unassigned) instead of deleting
                await db.documents.update_one({"id": doc["id"]}, {"$set": {"workspace_id": "vault"}})
            else:
                # Shared instance is removing. Remove from shared_with list
                await db.documents.update_one({"id": doc["id"]}, {"$pull": {"shared_with": workspace_id}})
            
            # Cleanup source index for this workspace
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

    @staticmethod
    async def get_chunks(name: str, limit: int = 100) -> List[Dict]:
        from qdrant_client.http import models as qmodels
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({
            "$or": [
                {"id": name},
                {"filename": name}
            ]
        })
        if not doc:
            return []
            
        workspace_id = doc.get("workspace_id")
        collection_name = await qdrant.get_effective_collection("knowledge_base", workspace_id)
        
        try:
            response = await qdrant.client.scroll(
                collection_name=collection_name,
                scroll_filter=qmodels.Filter(must=[qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=doc["id"]))]),
                limit=limit,
                with_payload=True,
                with_vectors=False
            )
            chunks = []
            for p in response[0]:
                chunks.append({
                    "id": p.id,
                    "text": p.payload.get("text", ""),
                    "index": p.payload.get("index", 0),
                    "metadata": {k: v for k, v in p.payload.items() if k not in ["text", "vector"]}
                })
            # Sort by index
            chunks.sort(key=lambda x: x["index"])
            return chunks
        except Exception as e:
            logger.error("get_chunks_failed", name=name, error=str(e))
            return []

    @staticmethod
    async def inspect(name: str) -> List[Dict]:
        from qdrant_client.http import models as qmodels
        db = mongodb_manager.get_async_database()
        # Support both ID and Filename
        doc = await db.documents.find_one({
            "$or": [
                {"id": name},
                {"filename": name}
            ]
        })
        if not doc:
            return []
            
        workspace_id = doc.get("workspace_id")
        collection_name = await qdrant.get_effective_collection("knowledge_base", workspace_id)
        
        try:
            response = await qdrant.client.scroll(
                collection_name=collection_name,
                scroll_filter=qmodels.Filter(must=[qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=doc["id"]))]),
                limit=100,
                with_payload=True,
                with_vectors=True
            )
            return [{"id": p.id, "payload": p.payload, "vector_size": len(p.vector) if p.vector else 0} for p in response[0]]
        except Exception as e:
            logger.error("inspect_failed", name=name, error=str(e))
            return []

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
        
        # 1. LINK ACTION (Branching): Create a new record for this content in the target workspace
        if action == "link":
            # Check if already exists in target
            exists = await db.documents.find_one({"workspace_id": target_workspace_id, "content_hash": res["content_hash"]})
            if exists:
                return # Already exists
                
            new_id = str(uuid.uuid4())[:8]
            new_doc = res.copy()
            if "_id" in new_doc: del new_doc["_id"]
            new_doc["id"] = new_id
            new_doc["workspace_id"] = target_workspace_id
            new_doc["shared_with"] = []
            new_doc["status"] = "uploaded" 
            new_doc["rag_config_hash"] = target_rag_hash
            new_doc["created_at"] = datetime.utcnow().isoformat()
            new_doc["updated_at"] = new_doc["created_at"]
            
            await db.documents.insert_one(new_doc)
            # Trigger indexing for the NEW branched record
            await self.index_document(new_id, target_workspace_id, task_id=task_id)
            return

        # 2. MOVE/SHARE ACTIONS: Auditing and in-place updates
        is_config_compatible = res.get("rag_config_hash") == target_rag_hash
        
        if not is_config_compatible and not force_reindex:
            raise ConflictError(
                message=f"Incompatible Workspace: Target RAG config ({target_rag_hash}) differs from Document ({res.get('rag_config_hash')})",
                params={"type": "rag_mismatch", "expected": res.get("rag_config_hash"), "actual": target_rag_hash}
            )

        if force_reindex or (not is_config_compatible) or res["status"] != "indexed":
            # Re-index original record if sharing/moving to incompatible space
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

document_service = DocumentService()
