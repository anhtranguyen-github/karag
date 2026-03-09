from __future__ import annotations

from typing import TYPE_CHECKING
from app.adapters import registry as adapters_registry
from app.core.encryption import decrypt_secret

if TYPE_CHECKING:
    from app.core.config import PlatformSettings
    from app.core.ports import StorageProvider, VectorStore
    from app.modules.organizations.schemas import DocumentStorageConfig
    from app.modules.workspaces.schemas import VectorStoreConfig


class StorageProviderFactory:
    def __init__(self, settings: PlatformSettings) -> None:
        self.settings = settings

    def create(self, config: DocumentStorageConfig | None = None) -> StorageProvider:
        # Use provided config or fall back to platform settings
        provider_type = (config.provider if config else None) or self.settings.default_storage_provider
        
        endpoint = (config.endpoint if config else None) or self.settings.minio_endpoint
        access_key = decrypt_secret((config.access_key if config else None)) or self.settings.minio_access_key
        secret_key = decrypt_secret((config.secret_key if config else None)) or self.settings.minio_secret_key
        bucket = (config.bucket if config else None) or self.settings.minio_bucket
        secure = (config.secure if config else None) or self.settings.minio_secure

        try:
            return adapters_registry.get_storage_provider(
                provider_type,
                endpoint=endpoint,
                access_key=access_key,
                secret_key=secret_key,
                bucket=bucket,
                secure=secure,
            )
        except KeyError:
            # Fallback to MinIO when unknown provider configured
            return adapters_registry.get_storage_provider(
                "minio",
                endpoint=None,
                access_key=None,
                secret_key=None,
                bucket=bucket,
                secure=secure,
            )


class VectorStoreFactory:
    def __init__(self, settings: PlatformSettings) -> None:
        self.settings = settings

    def create(self, store_type: str | None = None, config: VectorStoreConfig | None = None) -> VectorStore:
        resolved_type = store_type or self.settings.default_vector_store
        
        url = (config.url if config else None) or self.settings.qdrant_url
        api_key = decrypt_secret((config.api_key if config else None)) or self.settings.qdrant_api_key

        try:
            return adapters_registry.get_vector_store(resolved_type, url=url, api_key=api_key)
        except KeyError:
            return adapters_registry.get_vector_store("qdrant", url=None, api_key=None)
