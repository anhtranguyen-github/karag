import os
import hashlib
import uuid
from datetime import datetime
from typing import Dict, Optional
from fastapi import UploadFile

from backend.app.core.mongodb import mongodb_manager
from backend.app.core.minio import minio_manager
from backend.app.services.task_service import task_service
from .base import logger, tracer

class IngestionService:
    async def upload(self, file: UploadFile, workspace_id: str, strategy: Optional[str] = None) -> Dict:
        """Process and prepare a new document for ingestion."""
        with tracer.start_as_current_span(
            "document.upload",
            attributes={"workspace_id": workspace_id},
        ) as _:
            db = mongodb_manager.get_async_database()
            from backend.app.core.constants import ILLEGAL_NAME_CHARS
            original_filename = file.filename or "unnamed_file"
            found_chars = [c for c in ILLEGAL_NAME_CHARS if c in original_filename]
            if found_chars:
                return {
                    "status": "error",
                    "code": "INVALID_FILENAME",
                    "message": f"Filename contains illegal characters: {' '.join(found_chars)}. Please remove them and try again.",
                    "params": {"illegal": found_chars}
                }

            content = await file.read()
            file_hash = hashlib.sha256(content).hexdigest()
            file_type = file.content_type
            
            existing_local_name = await db.documents.find_one({"workspace_id": workspace_id, "filename": original_filename})
            existing_vault_doc = await db.documents.find_one({"content_hash": file_hash})
            
            conflict_type = None
            if existing_local_name and existing_vault_doc and existing_local_name["id"] == existing_vault_doc["id"]:
                conflict_type = "exact_duplicate"
            elif existing_local_name:
                conflict_type = "name_collision"
            elif existing_vault_doc:
                conflict_type = "content_collision"

            if conflict_type and not strategy:
                suggested_name = original_filename
                if conflict_type in ["name_collision", "exact_duplicate"]:
                    name, ext = os.path.splitext(original_filename)
                    suggested_name = f"{name} (1){ext}"
                
                return {
                    "status": "conflict",
                    "code": "DUPLICATE_DETECTED",
                    "message": f"Duplicate detected: {conflict_type}",
                    "params": {
                        "type": conflict_type,
                        "filename": original_filename,
                        "suggested_name": suggested_name,
                        "existing_doc": {
                            "id": existing_vault_doc["id"] if existing_vault_doc else existing_local_name["id"],
                            "filename": existing_vault_doc["filename"] if existing_vault_doc else existing_local_name["filename"],
                            "workspace": existing_vault_doc["workspace_id"] if existing_vault_doc else existing_local_name["workspace_id"]
                        } if (existing_vault_doc or existing_local_name) else None
                    }
                }

            target_filename = original_filename
            duplicate_info = {}

            if strategy == "rename":
                name, ext = os.path.splitext(original_filename)
                
                # Optimized regex query to find all conflicting names
                # Properly escaping components
                cursor = db.documents.find({
                    "workspace_id": workspace_id, 
                    "filename": {"$regex": f"^{re.escape(name)} \\(\\d+\\){re.escape(ext)}$"}
                })
                existing = await cursor.to_list(1000)
                
                max_count = 0
                import re
                for doc in existing:
                    match = re.search(r"\((\d+)\)", doc["filename"])
                    if match:
                        count = int(match.group(1))
                        if count > max_count:
                            max_count = count
                
                target_filename = f"{name} ({max_count + 1}){ext}"
            elif strategy == "overwrite" and existing_local_name:
                await self.delete(existing_local_name["filename"], workspace_id, vault_delete=True)

            task_id = await task_service.create_task("ingestion", {
                "filename": target_filename,
                "workspace_id": workspace_id
            }, workspace_id=workspace_id)

            return {
                "status": "success",
                "task_id": task_id,
                "content": content,
                "filename": target_filename,
                "content_type": file_type,
                "duplicate_info": duplicate_info
            }

    async def upload_arxiv(self, arxiv_id_or_url: str, workspace_id: str, strategy: Optional[str] = None) -> Dict:
        """Download from arXiv and prepare for ingestion."""
        with tracer.start_as_current_span(
            "document.upload_arxiv",
            attributes={"workspace_id": workspace_id, "arxiv_id_or_url": arxiv_id_or_url},
        ):
            import arxiv
            arxiv_id = arxiv_id_or_url.split('/')[-1]
            if arxiv_id.endswith('.pdf'):
                arxiv_id = arxiv_id[:-4]
            
            client = arxiv.Client()
            search = arxiv.Search(id_list=[arxiv_id])
            paper = next(client.results(search), None)
            if not paper:
                return {"status": "error", "code": "ARXIV_NOT_FOUND", "message": f"Paper '{arxiv_id}' not found."}

            safe_title = "".join([c if c.isalnum() or c in " .-_()" else "_" for c in paper.title])
            filename = f"{safe_title}.pdf"
            
            import httpx
            async with httpx.AsyncClient() as ac:
                res = await ac.get(paper.pdf_url)
                content = res.content

            # Validation logic mirrored from upload
            db = mongodb_manager.get_async_database()
            file_hash = hashlib.sha256(content).hexdigest()
            existing_local = await db.documents.find_one({"workspace_id": workspace_id, "filename": filename})
            existing_vault = await db.documents.find_one({"content_hash": file_hash})
            
            conflict_type = None
            if existing_local and existing_vault and existing_local["id"] == existing_vault["id"]:
                conflict_type = "exact_duplicate"
            elif existing_local:
                conflict_type = "name_collision"
            elif existing_vault:
                conflict_type = "content_collision"

            if conflict_type and not strategy:
                return {
                    "status": "conflict",
                    "code": "DUPLICATE_DETECTED",
                    "message": f"arXiv Duplicate: {conflict_type}",
                    "params": {"type": conflict_type, "filename": filename, "suggested_name": filename}
                }

            target_filename = filename
            if strategy == "rename":
                name, ext = os.path.splitext(filename)
                max_count = 0
                import re
                
                cursor = db.documents.find({
                    "workspace_id": workspace_id, 
                    # Escaping parentheses for regex: \( and \) needs double backslash in f-string or raw string logic
                    "filename": {"$regex": f"^{re.escape(name)} \\(\\d+\\){re.escape(ext)}$"}
                })
                existing = await cursor.to_list(1000)
                
                for doc in existing:
                    match = re.search(r"\((\d+)\)", doc["filename"])
                    if match:
                        count = int(match.group(1))
                        if count > max_count:
                            max_count = count
                            
                target_filename = f"{name} ({max_count + 1}){ext}"

            task_id = await task_service.create_task("arxiv_ingestion", {
                "arxiv_id": arxiv_id,
                "filename": target_filename,
                "workspace_id": workspace_id
            }, workspace_id=workspace_id)

            return {
                "status": "success",
                "task_id": task_id,
                "content": content,
                "filename": target_filename,
                "content_type": "application/pdf"
            }

    async def run_ingestion(self, task_id: str, safe_filename: str, content: bytes, content_type: str, workspace_id: str):
        """Phase 1: Storage and metadata."""
        try:
            if await task_service.is_cancelled(task_id):
                return
            await task_service.update_task(task_id, status="processing", progress=10, message="Uploading to vault...")
            
            doc_id = str(uuid.uuid4())[:8]
            file_hash = hashlib.sha256(content).hexdigest()
            extension = os.path.splitext(safe_filename)[1].lower() if safe_filename else ".tmp"
            minio_path = f"workspaces/{workspace_id}/documents/{doc_id}/v1/{safe_filename}"
            
            minio_manager.upload_file(minio_path, content, content_type)
            
            if await task_service.is_cancelled(task_id):
                minio_manager.delete_file(minio_path)
                return

            await task_service.update_task(task_id, progress=50, message="Recording metadata...")
            
            db = mongodb_manager.get_async_database()
            document_data = {
                "id": doc_id,
                "workspace_id": workspace_id,
                "filename": safe_filename,
                "extension": extension,
                "content_type": content_type,
                "minio_path": minio_path,
                "content_hash": file_hash,
                "status": "uploaded",
                "current_version": 1,
                "shared_with": [],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            await db.documents.insert_one(document_data)
            
            if await task_service.is_cancelled(task_id):
                await db.documents.delete_one({"id": doc_id})
                minio_manager.delete_file(minio_path)
                return

            await task_service.update_task(
                task_id, status="completed", progress=100,
                message=f"Document '{safe_filename}' saved to vault.",
                result={"doc_id": doc_id, "filename": safe_filename}
            )
            from backend.app.core.telemetry import DOCUMENT_INGESTION_COUNT
            DOCUMENT_INGESTION_COUNT.add(1, {"workspace_id": workspace_id, "status": "success"})
            
        except Exception as e:
            logger.error("ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.update_task(task_id, status="failed", message=str(e), error_code="INGESTION_FAILED")
