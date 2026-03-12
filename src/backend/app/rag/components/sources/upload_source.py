import logging
import os
from typing import Any

from app.rag.components.sources.base import BaseSource, FileMeta
from app.infra.storage.storage import S3CompatibleStorageProvider

logger = logging.getLogger(__name__)

class UploadSource(BaseSource):
    name = "upload"
    description = "Fetches user-uploaded files from storage."
    requirement = []
    requirements = []

    def __init__(self):
        super().__init__()


    async def initialize(self) -> None:
        pass

    def _get_provider(self) -> S3CompatibleStorageProvider:
        # In this implementation per requirements, we use app.infra.storage directly.
        # Ensure we connect to the right default bucket or let config override.
        # But we don't handle connection details directly.
        # Using S3CompatibleStorageProvider securely built in infra.
        return S3CompatibleStorageProvider(
            name="upload_source",
            bucket=os.getenv("UPLOAD_BUCKET", "karag_uploads"),
        )

    async def list_files(self, context: Any, config: dict[str, Any]) -> list[FileMeta]:
        """Fetch files previously uploaded via WebSocket."""
        # Use identifiers from config:
        # - upload_id OR
        # - storage_path OR
        # - file_ids
        
        project_id = getattr(context, "project_id", None)
        user_id = getattr(context, "user_id", None)
        
        if not project_id or not user_id:
            raise ValueError("UploadSource requires project_id and user_id in context.")

        upload_id = config.get("upload_id")
        storage_path = config.get("storage_path")
        
        if not upload_id and not storage_path:
            raise ValueError("UploadSource requires upload_id or storage_path in config.")

        provider = self._get_provider()
        
        # Build prefix based on project/user context and upload
        if storage_path:
            prefix = storage_path
        else:
            prefix = f"{project_id}/{user_id}/uploads/{upload_id}/"

        if not provider._client:
            raise RuntimeError("UploadSource: Storage client uninitialized.")

        try:
            paginator = provider._client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=provider.bucket, Prefix=prefix)
            
            results = []
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        name = obj['Key'].split('/')[-1]
                        results.append(FileMeta(
                            path=obj['Key'], 
                            size_bytes=obj['Size'], 
                            name=name
                        ))
            return results
        except Exception as e:
            raise RuntimeError(f"Error listing files from upload source: {e}") from e

    async def get_file(self, context: Any, file_meta: FileMeta) -> bytes:
        provider = self._get_provider()
        
        if not provider._client:
            raise RuntimeError("UploadSource: Storage client uninitialized.")

        try:
            return provider.get_object(file_meta.path)
        except Exception as e:
            raise RuntimeError(f"Error fetching file {file_meta.path} from storage: {e}") from e
