"""
Vault Service - Block 2: Data & Storage

Provides global vault storage for RAG.
VAULT TYPE:
- Global Vault: Platform-owned, read-only, shared across workspaces
- Documents here can be imported to workspace datasets.
"""

from datetime import datetime

import structlog
from backend.app.core.exceptions import NotFoundError
from backend.app.core.mongodb import mongodb_manager
from backend.app.schemas.baas import FileStoreConfig, Vault

logger = structlog.get_logger(__name__)


class VaultService:
    """
    Service for global vault lifecycle.
    """

    GLOBAL_VAULT_ID = "global"

    @classmethod
    async def initialize_global_vault(cls) -> Vault:
        """
        Ensure global vault exists.
        """
        db = mongodb_manager.get_async_database()

        existing = await db.vaults.find_one({"id": cls.GLOBAL_VAULT_ID})
        if existing:
            return Vault(**existing)

        # Create global vault
        global_vault = Vault(
            id=cls.GLOBAL_VAULT_ID,
            name="Global Knowledge Base",
            description="Platform-wide shared knowledge base (read-only)",
            is_active=True,
            file_store_config=FileStoreConfig(bucket="rag-docs", prefix="global/"),
        )

        await db.vaults.insert_one(global_vault.model_dump())

        logger.info("global_vault_initialized", vault_id=cls.GLOBAL_VAULT_ID)

        return global_vault

    @classmethod
    async def get_vault(cls, vault_id: str = "global") -> Vault:
        """Get the global vault."""
        db = mongodb_manager.get_async_database()

        vault_doc = await db.vaults.find_one({"id": vault_id, "is_active": True})
        if not vault_doc:
            raise NotFoundError(f"Vault '{vault_id}' not found")

        return Vault(**vault_doc)

    @classmethod
    async def update_stats(
        cls,
        vault_id: str,
        document_delta: int = 0,
        size_delta: int = 0,
    ) -> None:
        """Update global vault statistics."""
        db = mongodb_manager.get_async_database()

        await db.vaults.update_one(
            {"id": vault_id},
            {
                "$inc": {
                    "document_count": document_delta,
                    "total_size_bytes": size_delta,
                },
                "$set": {"updated_at": datetime.utcnow()},
            },
        )


# Singleton instance
vault_service = VaultService()
