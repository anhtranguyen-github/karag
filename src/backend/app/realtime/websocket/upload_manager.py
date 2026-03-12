import asyncio
import os
import uuid
import logging
from typing import Any

from app.core.config import PlatformSettings
from app.infra.storage.storage import S3CompatibleStorageProvider

logger = logging.getLogger(__name__)

class UploadManager:
    """Manages WebSocket upload sessions and persists files."""
    
    def __init__(self):
        settings = PlatformSettings()
        # We can store some active local session metadata if needed
        self.active_uploads = {}
        # Using the standard infrastructure client securely
        self.provider = S3CompatibleStorageProvider(
            name="upload_manager_provider",
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            bucket=settings.minio_bucket or "karag_uploads",
            secure=settings.minio_secure
        )
        if self.provider._client:
            logger.info(f"UploadManager: Initialized S3 storage on bucket '{self.provider.bucket}'")
        else:
            logger.warning("UploadManager: S3 client NOT initialized, falling back to MEMORY storage!")
        
    async def start_upload(self, context: Any, metadata: dict[str, Any]) -> str:
        """Initialize an upload session."""
        upload_id = str(uuid.uuid4())
        
        # We can store contextual metadata here to validate chunks later
        self.active_uploads[upload_id] = {
            "context": context,
            "metadata": metadata,
            "chunks": {},
            "size": 0
        }
        
        logger.info(f"Started upload session {upload_id}")
        return upload_id

    async def upload_chunk(self, upload_id: str, chunk_index: int, data: bytes) -> None:
        """Receive a chunk and store it temporarily in memory or directly to storage part."""
        if upload_id not in self.active_uploads:
            raise ValueError(f"Upload ID {upload_id} not found or expired.")
            
        # In a very naive implementation we keep chunks in memory. 
        # In production this would use S3 multipart uploads.
        # But this suffices for our example architecture.
        self.active_uploads[upload_id]["chunks"][chunk_index] = data
        self.active_uploads[upload_id]["size"] += len(data)

    async def finish_upload(self, upload_id: str) -> list[dict]:
        """Assemble the file and persist to infra storage."""
        if upload_id not in self.active_uploads:
            raise ValueError(f"Upload session {upload_id} does not exist.")
            
        session = self.active_uploads[upload_id]
        context = session["context"]
        metadata = session["metadata"]
        
        project_id = getattr(context, "project_id", "default_project")
        user_id = getattr(context, "user_id", "default_user")
        filename = metadata.get("filename", "unnamed_file.bin")
        content_type = metadata.get("mime_type", "application/octet-stream")
        
        # Assemble from chunks correctly ordered
        sorted_chunks = [session["chunks"][i] for i in sorted(session["chunks"].keys())]
        full_content = b"".join(sorted_chunks)
        
        # Determine path
        path = f"{project_id}/{user_id}/uploads/{upload_id}/{filename}"
        
        logger.info(f"Finishing upload to path {path} ({session['size']} bytes)")
        
        # Store via app.infra.storage directly
        if self.provider._client:
            self.provider.store_object(
                path=path,
                content=full_content,
                content_type=content_type,
                metadata={"upload_id": upload_id, "user_id": user_id}
            )
        else:
            raise RuntimeError("UploadManager: Failed to initialize storage provider.")
            
        # Clean up session
        del self.active_uploads[upload_id]
        
        # Return file meta
        return [{
            "path": path,
            "name": filename,
            "size_bytes": len(full_content),
            "mime_type": content_type
        }]
