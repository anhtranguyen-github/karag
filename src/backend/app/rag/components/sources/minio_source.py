import logging
from typing import Any
from dataclasses import dataclass

from app.rag.components.sources.base import BaseSource, FileMeta
from app.infra.storage.storage import S3CompatibleStorageProvider

logger = logging.getLogger(__name__)

class MinIOSource(BaseSource):
    name = "minio"
    description = "Fetches documents from a MinIO/S3 compatible storage."
    requirement = ["boto3"]
    def __init__(self):
        super().__init__()
        self._provider = None

    async def initialize(self) -> None:
        # Lazy loading or any async init if needed
        pass

    def _get_provider(self, config: dict[str, Any]) -> S3CompatibleStorageProvider:
        # In a real app, endpoint/keys might come from config or env
        # Per requirements, we connect via app.infra.storage
        bucket = config.get("bucket")
        if not bucket:
            raise ValueError("MinIOSource requires 'bucket' in config.")
        
        # S3CompatibleStorageProvider creates the client via boto3 securely
        # as defined in app.infra.storage
        return S3CompatibleStorageProvider(
            name="minio_source",
            bucket=bucket,
            # Let the provider read credentials from environment or we could pass them if they were in config.
        )

    async def list_files(self, context: Any, config: dict[str, Any]) -> list[FileMeta]:
        provider = self._get_provider(config)
        
        # Resolve prefix using tenant/project context
        project_id = getattr(context, "project_id", None)
        if not project_id:
            raise ValueError("MinIOSource requires a project_id in context.")

        prefix_conf = config.get("prefix", "")
        # Construct the prefix: e.g. "project_id/prefix_conf"
        prefix = f"{project_id}/{prefix_conf}" if prefix_conf else f"{project_id}/"

        if not provider._client:
            raise RuntimeError("MinIOSource: S3 client failed to initialize (bad credentials/endpoint?).")

        # Simulate async or run boto3 in thread if needed. Boto3 is synchronous, but we are marking async.
        # In this implementation we will just call it synchronously inside the async method.
        # Note: Boto3 doesn't have native async, so we'd normally use aioboto3 or run_in_executor.
        # But per requirements we use app.infra.storage which is synchronous.
        
        try:
            paginator = provider._client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=provider.bucket, Prefix=prefix)
            
            results = []
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        results.append(FileMeta(path=obj['Key'], size_bytes=obj['Size'], name=obj['Key'].split('/')[-1]))
            return results
        except Exception as e:
            raise RuntimeError(f"Error listing files from MinIO: {e}") from e

    async def get_file(self, context: Any, file_meta: FileMeta) -> bytes:
        config = getattr(context, "source_config", {}) # Fallback to get provider, or we could pass provider along
        
        # Re-initialize provider
        # In a real use case we'd probably define a cleaner way, but this fits the signature
        # We will assume config is passed, or we just reconstruct the provider.
        # Actually `get_file` doesn't take config in the given signature: `async def get_file(self, context, file_meta)`
        # Let's assume bucket config is in context.
        bucket = getattr(context, "bucket", "karag")
        provider = S3CompatibleStorageProvider(name="minio_source", bucket=bucket)

        if not provider._client:
            raise RuntimeError("MinIOSource: S3 client failed to initialize.")

        try:
            return provider.get_object(file_meta.path)
        except Exception as e:
            raise RuntimeError(f"Error fetching file {file_meta.path} from MinIO: {e}") from e
