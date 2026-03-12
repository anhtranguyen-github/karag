from __future__ import annotations
import base64
import json
import logging
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from app.karag_manager import KaragManager
from app.realtime.websocket.upload_manager import UploadManager
from app.rag.managers.pipeline.ingestion_manager import IngestionManager
from app.modules.documents.schemas import DocumentCreate

logger = logging.getLogger(__name__)

class FileUploadHandler:
    """Handles WebSocket file upload events and triggers ingestion via IngestionManager."""
    
    def __init__(self, karag_manager: KaragManager):
        self.upload_manager = UploadManager()
        self.ingestion_manager = karag_manager.ingestion_manager
        self.karag_manager = karag_manager

    async def handle_message(self, context: Any, message: str) -> dict:
        """Process incoming WebSocket JSON messages."""
        try:
            payload = json.loads(message)
            msg_type = payload.get("type")
            
            if msg_type == "start_upload":
                metadata = payload.get("metadata", {})
                upload_id = await self.upload_manager.start_upload(context, metadata)
                return {"status": "ok", "type": "upload_started", "upload_id": upload_id}
                
            elif msg_type == "upload_chunk":
                upload_id = payload.get("upload_id")
                chunk_index = payload.get("chunk_index")
                b64_data = payload.get("data", "")
                
                if not upload_id or chunk_index is None:
                    return {"status": "error", "message": "Missing upload_id or chunk_index"}
                
                try:
                    data = base64.b64decode(b64_data)
                except Exception as e:
                    return {"status": "error", "message": f"Invalid base64 data: {e}"}
                    
                await self.upload_manager.upload_chunk(upload_id, chunk_index, data)
                return {"status": "ok", "type": "chunk_received", "chunk_index": chunk_index}
                
            elif msg_type == "finish_upload":
                upload_id = payload.get("upload_id")
                if not upload_id:
                    return {"status": "error", "message": "Missing upload_id"}
                
                # Assemble content directly from session to pass as bytes to ingestion!
                session = self.upload_manager.active_uploads.get(upload_id)
                if not session:
                    return {"status": "error", "message": "Upload session not found."}
                
                sorted_chunks = [session["chunks"][i] for i in sorted(session["chunks"].keys())]
                content_bytes = b"".join(sorted_chunks)
                metadata = session["metadata"]
                
                # 1. Store via UploadManager first (to persistent storage)
                file_metas = await self.upload_manager.finish_upload(upload_id)
                
                # Create DB Record for the project document
                # Construct mock tenant from metadata
                project_id = metadata.get("project_id", "test_project")
                org_id = metadata.get("organization_id", "test_org")
                workspace_id = metadata.get("workspace_id") or None
                filename = metadata.get("filename", "uploaded_file.bin")
                
                doc_create = DocumentCreate(
                    title=filename,
                    extension=filename.split(".")[-1],
                    file_size=len(content_bytes),
                    project_id=project_id,
                    organization_id=org_id,
                    storage_path=file_metas[0]["path"],
                    source="upload",
                    status="uploading",
                )
                doc_summary = self.karag_manager.documents_repository.create(doc_create)
                self.karag_manager.documents_repository.update_status(org_id, project_id, doc_summary.id, "uploaded")

                # 2. Trigger Ingestion via the unified pipeline manager!
                # Create a local progress wrapper for this upload_id
                async def progress_callback(status: str, progress: int):
                    await self.karag_manager.notify_upload_progress(upload_id, status, progress)
                    # Persist status to DB
                    self.karag_manager.documents_repository.update_status(org_id, project_id, doc_summary.id, status)

                await self.ingestion_manager.run(
                    workspace_id=metadata.get("workspace_id", "default_workspace"), 
                    project_id=project_id,        
                    organization_id=org_id,       
                    filename=filename,
                    content_bytes=content_bytes,
                    mime_type=metadata.get("mime_type", "application/pdf"),
                    track_id=upload_id,
                    on_progress=progress_callback,
                    document_id=doc_summary.id
                )
                
                return {
                    "status": "ok", 
                    "type": "upload_finished", 
                    "upload_id": upload_id,
                    "files": file_metas,
                    "ingestion_status": "started"
                }
                
            else:
                return {"status": "error", "message": "Unknown message type"}
                
        except json.JSONDecodeError:
            return {"status": "error", "message": "Invalid JSON format"}
        except Exception as e:
            logger.exception("WebSocket Upload error")
            return {"status": "error", "message": str(e)}
