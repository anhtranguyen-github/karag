import os
import shutil
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
    async def upload(file: UploadFile, workspace_id: str) -> Tuple[str, bytes, str, str]:
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

            # 2. Local name duplicate check
            existing_doc = await db.documents.find_one({"workspace_id": workspace_id, "filename": original_filename})
            if existing_doc:
                raise ConflictError(f"Document '{original_filename}' already exists in this workspace.")

            content = await file.read()
            file_size = len(content)
            file_type = file.content_type
            
            # Sanitize filename for internal storage safety
            safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', original_filename)
                
            # Create Task
            task_id = task_service.create_task("ingestion", {
                "filename": original_filename,
                "safe_filename": safe_filename,
                "workspace_id": workspace_id,
                "size": file_size
            })

            span.set_attribute("document.filename", original_filename)
            span.set_attribute("document.size_bytes", file_size)
            logger.info(
                "document_upload_accepted",
                filename=original_filename,
                size_bytes=file_size,
                workspace_id=workspace_id,
                task_id=task_id,
            )
            
            return task_id, content, original_filename, file_type

    @staticmethod
    async def upload_arxiv(arxiv_id_or_url: str, workspace_id: str) -> Tuple[str, bytes, str, str]:
        """Download a paper from arXiv and prepare it for ingestion."""
        with tracer.start_as_current_span(
            "document.upload_arxiv",
            attributes={"workspace_id": workspace_id, "arxiv_id_or_url": arxiv_id_or_url},
        ) as span:
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
                
                # 6. Create Task
                task_id = task_service.create_task("ingestion", {
                    "filename": filename,
                    "safe_filename": filename,
                    "workspace_id": workspace_id,
                    "size": file_size,
                    "source": "arxiv",
                    "arxiv_id": arxiv_id
                })

                logger.info(
                    "document_arxiv_download_complete",
                    filename=filename,
                    arxiv_id=arxiv_id,
                    workspace_id=workspace_id,
                    task_id=task_id,
                )
                
                return task_id, content, filename, content_type

            except Exception as e:
                logger.error("arxiv_download_failed", arxiv_id=arxiv_id, error=str(e))
                if isinstance(e, ConflictError):
                    raise e
                raise ValidationError(f"Failed to download arXiv paper: {str(e)}")

    async def run_ingestion(self, task_id: str, safe_filename: str, content: bytes, content_type: str, workspace_id: str):
        """Internal method to run the pipeline steps with global vault deduplication."""
        db = mongodb_manager.get_async_database()
        doc_id = None
        try:
            task_service.update_task(task_id, status="processing", progress=10, message="Calculating signatures...")
            file_hash = hashlib.sha256(content).hexdigest()
            file_size = len(content)
            
            # 1. GLOBAL VAULT DEDUPLICATION CHECK
            # Check if this file already exists in ANY workspace (or in the vault)
            existing_vault_doc = await db.documents.find_one({"content_hash": file_hash})
            
            doc_id = str(uuid.uuid4())[:8]
            extension = os.path.splitext(safe_filename)[1].lower()
            version = 1
            timestamp = datetime.utcnow().isoformat()
            
            # RAG Config Hash for Traceability
            settings = await settings_manager.get_settings(workspace_id)
            rag_hash = settings.get_rag_hash()

            if existing_vault_doc:
                # REUSE PHYSICAL STORAGE (MinIO)
                minio_path = existing_vault_doc["minio_path"]
                task_service.update_task(task_id, progress=30, message="Linking to existing vault record...")
            else:
                # NEW PHYSICAL UPLOAD
                minio_path = f"vault/{doc_id}/v{version}/{safe_filename}"
                task_service.update_task(task_id, progress=30, message="Storing in global vault...")
                await minio_manager.upload_file(minio_path, io.BytesIO(content), file_size, content_type=content_type)

            # Create MongoDB record for THIS workspace
            doc_record = {
                "id": doc_id, 
                "workspace_id": workspace_id, 
                "filename": safe_filename,
                "extension": extension, 
                "minio_path": minio_path, 
                "status": "indexing",
                "current_version": version, 
                "content_hash": file_hash, 
                "size_bytes": file_size,
                "chunks": 0, 
                "created_at": timestamp, 
                "updated_at": timestamp, 
                "shared_with": [],
                "rag_config_hash": rag_hash  # Traceability
            }
            await db.documents.insert_one(doc_record)
            
            # Check if we can also reuse embeddings (Only if RAG config matches exactly)
            if existing_vault_doc and existing_vault_doc.get("rag_config_hash") == rag_hash:
                 task_service.update_task(task_id, progress=90, message="Reusing compatible embeddings...")
                 # Link the existing vectors in Qdrant to this new workspace_id
                 from qdrant_client.http import models as qmodels
                 await qdrant.client.set_payload(
                     collection_name=await qdrant.get_effective_collection("knowledge_base", workspace_id),
                     payload={"shared_with": [workspace_id]}, # Simple link by adding to shared_with or mirroring
                     points=qmodels.Filter(must=[qmodels.FieldCondition(key="content_hash", match=qmodels.MatchValue(value=file_hash))])
                 )
                 num_chunks = existing_vault_doc.get("chunks", 0)
                 await db.documents.update_one({"id": doc_id}, {"$set": {"status": "indexed", "chunks": num_chunks}})
                 task_service.update_task(task_id, status="completed", progress=100, message="Reused existing embeddings.")
                 return

            # Perform indexing if no match or incompatible config
            task_service.update_task(task_id, progress=50, message="Neural chunking...")
            suffix = extension
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            try:
                await ingestion_pipeline.initialize(workspace_id=workspace_id)
                task_service.update_task(task_id, progress=70, message="Generating embeddings...")
                
                num_chunks = await ingestion_pipeline.process_file(
                    tmp_path, 
                    metadata={
                        "filename": safe_filename, 
                        "workspace_id": workspace_id,
                        "doc_id": doc_id, 
                        "version": version, 
                        "minio_path": minio_path,
                        "content_hash": file_hash,
                        "rag_config_hash": rag_hash
                    }
                )
                
                await db.documents.update_one({"id": doc_id}, {"$set": {"status": "indexed", "chunks": num_chunks}})
                task_service.update_task(task_id, status="completed", progress=100, message="Successfully indexed.")
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                    
        except Exception as e:
            extension = os.path.splitext(safe_filename)[1].lower()
            DOCUMENT_INGESTION_COUNT.labels(extension=extension, status="failed").inc()
            logger.error(
                "ingestion_failed",
                filename=safe_filename,
                workspace_id=workspace_id,
                error=str(e),
                exc_info=True,
            )
            error_msg = str(e)
            error_code = "INTERNAL_ERROR"
            if "illegal path" in error_msg.lower():
                error_code = "ILLEGAL_PATH"
            elif "connection" in error_msg.lower():
                error_code = "CONNECTION_ERROR"
                
            task_service.update_task(task_id, status="failed", message=error_msg, error_code=error_code)
            if doc_id:
                await db.documents.update_one({"id": doc_id}, {"$set": {"status": "failed"}})

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

    @staticmethod
    async def get_content(name: str) -> Optional[str]:
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
            for dim in [384, 768, 1024, 1536, 1792, 3072]:
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

    @staticmethod
    async def update_workspaces(name: str, target_workspace_id: str, action: str, force_reindex: bool = False):
        """Cross-workspace orchestration (move/share) with RAG Config auditing."""
        db = mongodb_manager.get_async_database()
        res = await db.documents.find_one({"filename": name})
        if not res:
            raise NotFoundError(f"Document '{name}' not found.")

        target_settings = await settings_manager.get_settings(target_workspace_id)
        target_rag_hash = target_settings.get_rag_hash()
        
        # AUDIT: Check if target config matches existing embeddings
        is_config_compatible = res.get("rag_config_hash") == target_rag_hash
        
        if not is_config_compatible and not force_reindex:
            raise ConflictError(
                message=f"Incompatible Workspace: Target RAG config ({target_rag_hash}) differs from Document ({res.get('rag_config_hash')})",
                params={"type": "rag_mismatch", "expected": res.get("rag_config_hash"), "actual": target_rag_hash}
            )

        if force_reindex or (not is_config_compatible):
            # Full Re-indexing Flow (Using shared vault document)
            file_data = minio_manager.get_file(res["minio_path"])
            if not file_data:
                raise ValueError("Source file missing in vault storage.")
                
            suffix = res.get("extension", ".tmp")
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name

            try:
                await ingestion_pipeline.initialize(workspace_id=target_workspace_id)
                await ingestion_pipeline.process_file(
                    tmp_path, 
                    metadata={
                        "filename": res["filename"], 
                        "workspace_id": target_workspace_id,
                        "doc_id": res["id"],
                        "version": res.get("current_version", 1),
                        "minio_path": res["minio_path"],
                        "content_hash": res["content_hash"],
                        "rag_config_hash": target_rag_hash
                    }
                )
                await db.documents.update_one({"id": res["id"]}, {"$set": {"rag_config_hash": target_rag_hash}})
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        # Update MongoDB Association
        if action == "move":
            source_ws_id = res["workspace_id"]
            # 1. Update ownership in DB
            await db.documents.update_one({"id": res["id"]}, {"$set": {"workspace_id": target_workspace_id}})
            
            # 2. Cleanup source index (if it's a different workspace)
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

document_service = DocumentService()
