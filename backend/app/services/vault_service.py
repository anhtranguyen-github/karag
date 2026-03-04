"""
Vault Service - Block 2: Data & Storage

Provides vault-based knowledge storage for RAG.

VAULT TYPES:
- Global Vault: Platform-owned, read-only, shared across workspaces
- Workspace Vault: Isolated per workspace, full CRUD

ISOLATION: Workspace vaults use collection naming: "ws_{workspace_id}_kb"
"""

import structlog
from typing import List, Optional, Literal
from datetime import datetime

from backend.app.core.mongodb import mongodb_manager
from backend.app.core.exceptions import NotFoundError, ConflictError, AuthorizationError
from backend.app.schemas.baas import (
    Vault, 
    VectorStoreConfig, 
    FileStoreConfig,
    Document,
    Chunk,
    VaultAccessError
)

logger = structlog.get_logger(__name__)


class VaultService:
    """
    Service for vault lifecycle and access management.
    
    ISOLATION PRINCIPLE:
    - Each workspace has its own isolated vault(s)
    - Global vault is read-only and shared
    - Cross-workspace vault access is blocked
    """
    
    GLOBAL_VAULT_ID = "global"
    DEFAULT_WORKSPACE_VAULT = "default"
    
    @classmethod
    async def initialize_global_vault(cls) -> Vault:
        """
        Ensure global vault exists.
        
        Called on system startup. Creates global vault if missing.
        """
        db = mongodb_manager.get_async_database()
        
        existing = await db.vaults.find_one({"id": cls.GLOBAL_VAULT_ID})
        if existing:
            return Vault(**existing)
        
        # Create global vault
        global_vault = Vault(
            id=cls.GLOBAL_VAULT_ID,
            type="global",
            owner_workspace_id=None,  # Platform-owned
            name="Global Knowledge Base",
            description="Platform-wide shared knowledge base (read-only)",
            is_read_only=True,
            allowed_workspace_ids=[],  # Empty = all workspaces can read
            vector_store_config=VectorStoreConfig(
                collection_name="global_kb",
                dimension=1536,
                distance_metric="cosine"
            ),
            file_store_config=FileStoreConfig(
                bucket="rag-docs",
                prefix="global/"
            )
        )
        
        await db.vaults.insert_one(global_vault.model_dump())
        
        logger.info("global_vault_initialized", vault_id=cls.GLOBAL_VAULT_ID)
        
        return global_vault
    
    @classmethod
    async def create_workspace_vault(
        cls,
        workspace_id: str,
        name: str,
        description: Optional[str] = None
    ) -> Vault:
        """
        Create a new workspace-scoped vault.
        
        Args:
            workspace_id: The owning workspace
            name: Vault name
            description: Optional description
            
        Returns:
            Created Vault object
            
        Raises:
            NotFoundError: If workspace doesn't exist
            ConflictError: If vault name already exists in workspace
        """
        db = mongodb_manager.get_async_database()
        
        # Validate workspace exists
        workspace = await db.workspaces.find_one({"id": workspace_id})
        if not workspace:
            raise NotFoundError(f"Workspace '{workspace_id}' not found")
        
        # Check for duplicate name
        existing = await db.vaults.find_one({
            "owner_workspace_id": workspace_id,
            "name": name
        })
        if existing:
            raise ConflictError(f"Vault with name '{name}' already exists in this workspace")
        
        # Generate vault ID
        import secrets
        vault_id = f"vault_{secrets.token_hex(8)}"
        
        # Create vault
        vault = Vault(
            id=vault_id,
            type="workspace",
            owner_workspace_id=workspace_id,
            name=name,
            description=description,
            is_read_only=False,
            allowed_workspace_ids=[workspace_id],  # Only owner can access
            vector_store_config=VectorStoreConfig(
                collection_name=f"ws_{workspace_id}_kb",  # ISOLATION
                dimension=1536,
                distance_metric="cosine"
            ),
            file_store_config=FileStoreConfig(
                bucket="rag-docs",
                prefix=f"workspaces/{workspace_id}/"
            )
        )
        
        await db.vaults.insert_one(vault.model_dump())
        
        # Update workspace's vault list
        await db.workspaces.update_one(
            {"id": workspace_id},
            {"$push": {"vault_ids": vault_id}}
        )
        
        logger.info(
            "vault_created",
            vault_id=vault_id,
            workspace_id=workspace_id,
            name=name
        )
        
        return vault
    
    @classmethod
    async def get_vault(
        cls,
        vault_id: str,
        workspace_id: str,
        required_permission: Literal["read", "write", "delete"] = "read"
    ) -> Vault:
        """
        Get vault with access control check.
        
        ISOLATION: This is where cross-workspace access is blocked.
        
        Args:
            vault_id: The vault to access
            workspace_id: Requesting workspace (from auth context)
            required_permission: The operation being performed
            
        Returns:
            Vault object
            
        Raises:
            NotFoundError: If vault doesn't exist
            AuthorizationError: If workspace doesn't have access
        """
        db = mongodb_manager.get_async_database()
        
        vault_doc = await db.vaults.find_one({"id": vault_id, "is_active": True})
        if not vault_doc:
            raise NotFoundError(f"Vault '{vault_id}' not found")
        
        vault = Vault(**vault_doc)
        
        # ISOLATION CHECK
        if vault.type == "global":
            # Global vault: read-only access for all workspaces
            if required_permission != "read":
                logger.warning(
                    "global_vault_write_attempt",
                    vault_id=vault_id,
                    workspace_id=workspace_id,
                    attempted_permission=required_permission
                )
                raise AuthorizationError(
                    "Global vault is read-only",
                    details={
                        "vault_id": vault_id,
                        "vault_type": "global",
                        "attempted_operation": required_permission
                    }
                )
            # Allow read access
            return vault
        
        else:
            # Workspace vault: check ownership
            if vault.owner_workspace_id != workspace_id:
                # Check if explicitly allowed (for future sharing feature)
                if workspace_id not in vault.allowed_workspace_ids:
                    logger.warning(
                        "cross_workspace_vault_access_blocked",
                        vault_id=vault_id,
                        vault_workspace=vault.owner_workspace_id,
                        requesting_workspace=workspace_id
                    )
                    raise AuthorizationError(
                        f"Workspace '{workspace_id}' does not have access to vault '{vault_id}'",
                        details={
                            "vault_id": vault_id,
                            "vault_workspace": vault.owner_workspace_id,
                            "your_workspace": workspace_id
                        }
                    )
            
            # Check read-only for write operations
            if vault.is_read_only and required_permission != "read":
                raise AuthorizationError(
                    f"Vault '{vault_id}' is read-only",
                    details={"vault_id": vault_id}
                )
            
            return vault
    
    @classmethod
    async def list_workspace_vaults(
        cls,
        workspace_id: str,
        include_global: bool = True
    ) -> List[Vault]:
        """
        List all vaults accessible to a workspace.
        
        Args:
            workspace_id: The workspace to list vaults for
            include_global: Whether to include global vault
            
        Returns:
            List of accessible Vault objects
        """
        db = mongodb_manager.get_async_database()
        
        vaults = []
        
        # Add global vault if enabled
        if include_global:
            global_vault = await db.vaults.find_one({"id": cls.GLOBAL_VAULT_ID})
            if global_vault:
                vaults.append(Vault(**global_vault))
        
        # Add workspace vaults
        cursor = db.vaults.find({
            "type": "workspace",
            "owner_workspace_id": workspace_id,
            "is_active": True
        })
        
        async for doc in cursor:
            vaults.append(Vault(**doc))
        
        return vaults
    
    @classmethod
    async def get_or_create_default_vault(cls, workspace_id: str) -> Vault:
        """
        Get or create the default vault for a workspace.
        
        Every workspace has a default vault for simple use cases.
        
        Args:
            workspace_id: The workspace
            
        Returns:
            The default Vault object
        """
        db = mongodb_manager.get_async_database()
        
        # Try to find existing default vault
        vault = await db.vaults.find_one({
            "owner_workspace_id": workspace_id,
            "name": cls.DEFAULT_WORKSPACE_VAULT
        })
        
        if vault:
            return Vault(**vault)
        
        # Create default vault
        return await cls.create_workspace_vault(
            workspace_id=workspace_id,
            name=cls.DEFAULT_WORKSPACE_VAULT,
            description="Default knowledge base for this workspace"
        )
    
    @classmethod
    async def delete_vault(
        cls,
        vault_id: str,
        workspace_id: str,
        delete_contents: bool = False
    ) -> bool:
        """
        Delete (deactivate) a vault.
        
        Args:
            vault_id: The vault to delete
            workspace_id: The requesting workspace
            delete_contents: If True, also delete all documents/chunks
            
        Returns:
            True if deleted
            
        Raises:
            NotFoundError: If vault doesn't exist
            AuthorizationError: If workspace doesn't own the vault
        """
        db = mongodb_manager.get_async_database()
        
        # Get vault with access check
        vault = await cls.get_vault(vault_id, workspace_id, "delete")
        
        # Cannot delete global vault
        if vault.type == "global":
            raise AuthorizationError("Cannot delete global vault")
        
        if delete_contents:
            # TODO: Delete all documents and chunks
            # This requires document service integration
            logger.warning(
                "vault_delete_with_contents",
                vault_id=vault_id,
                workspace_id=workspace_id
            )
        
        # Soft delete (deactivate)
        await db.vaults.update_one(
            {"id": vault_id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        
        # Update workspace
        await db.workspaces.update_one(
            {"id": workspace_id},
            {"$pull": {"vault_ids": vault_id}}
        )
        
        logger.info("vault_deleted", vault_id=vault_id, workspace_id=workspace_id)
        
        return True
    
    @classmethod
    async def update_stats(
        cls,
        vault_id: str,
        document_delta: int = 0,
        chunk_delta: int = 0,
        size_delta: int = 0
    ) -> None:
        """
        Update vault statistics.
        
        Called by document service after ingestions/deletions.
        
        Args:
            vault_id: The vault to update
            document_delta: Change in document count
            chunk_delta: Change in chunk count
            size_delta: Change in total size
        """
        db = mongodb_manager.get_async_database()
        
        await db.vaults.update_one(
            {"id": vault_id},
            {
                "$inc": {
                    "document_count": document_delta,
                    "total_chunks": chunk_delta,
                    "total_size_bytes": size_delta
                },
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    
    @classmethod
    def get_collection_name(cls, workspace_id: str, vault_id: Optional[str] = None) -> str:
        """
        Get the vector store collection name for a workspace/vault.
        
        ISOLATION: Collection names are workspace-scoped.
        
        Args:
            workspace_id: The workspace
            vault_id: Optional specific vault (default: workspace default)
            
        Returns:
            Collection name string
        """
        if vault_id == cls.GLOBAL_VAULT_ID:
            return "global_kb"
        
        return f"ws_{workspace_id}_kb"


# Singleton instance
vault_service = VaultService()
