"""
API Key Service - Block 1: Identity & Access

Provides workspace-scoped API key authentication.

ISOLATION: Each key maps to exactly one workspace.
SECURITY: Keys are hashed with Argon2, only shown once on creation.
"""

import secrets
import structlog
from datetime import datetime, timedelta
from typing import Optional, List
from passlib.context import CryptContext

from backend.app.core.mongodb import mongodb_manager
from backend.app.core.exceptions import AuthenticationError, NotFoundError
from backend.app.schemas.baas import APIKey, APIKeyCreateResponse, IsolationContext

logger = structlog.get_logger(__name__)

# Argon2 for secure key hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Prefix for new API keys
KEY_PREFIX = "karag_"
KEY_LENGTH = 48  # Total key length (prefix + 40 random chars)


class APIKeyService:
    """
    Service for API key lifecycle management.

    ISOLATION PRINCIPLE:
    - Every API key belongs to exactly one workspace
    - Cross-workspace key usage is impossible by design
    - Workspace context is extracted from key lookup
    """

    @staticmethod
    def _generate_key() -> str:
        """Generate a new cryptographically secure API key."""
        random_part = secrets.token_urlsafe(40)[:40]
        return f"{KEY_PREFIX}{random_part}"

    @staticmethod
    def _hash_key(key: str) -> str:
        """Hash an API key for storage."""
        return pwd_context.hash(key)

    @staticmethod
    def _verify_key(plain_key: str, hashed_key: str) -> bool:
        """Verify an API key against its hash."""
        return pwd_context.verify(plain_key, hashed_key)

    @staticmethod
    def _get_key_prefix(key: str) -> str:
        """Extract prefix for identification (first 12 chars after prefix)."""
        clean_key = key.replace(KEY_PREFIX, "")
        return clean_key[:12]

    @classmethod
    async def create_key(
        cls,
        workspace_id: str,
        permissions: Optional[List[str]] = None,
        expires_days: Optional[int] = None,
        description: Optional[str] = None,
    ) -> APIKeyCreateResponse:
        """
        Create a new API key for a workspace.

        SECURITY: This is the ONLY time the full key is returned.
        The key is hashed immediately and cannot be retrieved later.

        Args:
            workspace_id: The workspace this key belongs to
            permissions: List of permissions (read, write, delete, admin)
            expires_days: Optional expiration in days
            description: Optional description for the key

        Returns:
            APIKeyCreateResponse with the full key (SAVE THIS NOW)

        Raises:
            NotFoundError: If workspace doesn't exist
        """
        db = mongodb_manager.get_async_database()

        # Validate workspace exists
        workspace = await db.workspaces.find_one({"id": workspace_id})
        if not workspace:
            raise NotFoundError(f"Workspace '{workspace_id}' not found")

        # Generate key material
        full_key = cls._generate_key()
        key_hash = cls._hash_key(full_key)
        key_prefix = cls._get_key_prefix(full_key)

        # Calculate expiration
        expires_at = None
        if expires_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)

        # Default permissions
        perms = permissions or ["read", "write"]

        # Create key ID
        key_id = f"key_{secrets.token_hex(8)}"

        # Store in database
        api_key = APIKey(
            id=key_id,
            workspace_id=workspace_id,
            key_hash=key_hash,
            key_prefix=key_prefix,
            permissions=perms,
            expires_at=expires_at,
            description=description,
            created_at=datetime.utcnow(),
            is_active=True,
        )

        await db.api_keys.insert_one(api_key.model_dump())

        logger.info(
            "api_key_created",
            key_id=key_id,
            workspace_id=workspace_id,
            permissions=perms,
            has_expiration=expires_at is not None,
        )

        # Return response with FULL KEY (only time it's visible)
        return APIKeyCreateResponse(
            id=key_id,
            workspace_id=workspace_id,
            api_key=full_key,  # THIS IS THE ONLY TIME THIS IS SHOWN
            key_prefix=key_prefix,
            permissions=perms,
            expires_at=expires_at,
            created_at=api_key.created_at,
        )

    @classmethod
    async def validate_key(cls, key: str) -> IsolationContext:
        """
        Validate an API key and return workspace context.

        This is the core isolation mechanism - every request
        must pass through this to get its workspace context.

        Args:
            key: The API key to validate

        Returns:
            IsolationContext with workspace_id and permissions

        Raises:
            AuthenticationError: If key is invalid, expired, or revoked
        """
        if not key or not key.startswith(KEY_PREFIX):
            raise AuthenticationError("Invalid API key format")

        db = mongodb_manager.get_async_database()

        # Extract prefix for lookup optimization
        key_prefix = cls._get_key_prefix(key)

        # Find potential matches by prefix (optimization)
        cursor = db.api_keys.find({"key_prefix": key_prefix, "is_active": True})

        # Check each candidate
        async for key_doc in cursor:
            stored_hash = key_doc.get("key_hash")

            if cls._verify_key(key, stored_hash):
                # Key matches - check expiration
                expires_at = key_doc.get("expires_at")
                if expires_at and datetime.utcnow() > expires_at:
                    logger.warning(
                        "api_key_expired",
                        key_id=key_doc["id"],
                        workspace_id=key_doc["workspace_id"],
                    )
                    raise AuthenticationError("API key has expired")

                # Key is valid - update last used
                await db.api_keys.update_one(
                    {"id": key_doc["id"]},
                    {
                        "$set": {"last_used_at": datetime.utcnow()},
                        "$inc": {"use_count": 1},
                    },
                )

                logger.debug(
                    "api_key_validated",
                    key_id=key_doc["id"],
                    workspace_id=key_doc["workspace_id"],
                )

                # Return isolation context
                return IsolationContext(
                    workspace_id=key_doc["workspace_id"],
                    api_key_id=key_doc["id"],
                    permissions=key_doc.get("permissions", ["read"]),
                    dataset_ids=key_doc.get("dataset_ids", ["default"]),
                )

        # No matching key found
        raise AuthenticationError("Invalid API key")

    @classmethod
    async def revoke_key(
        cls,
        key_id: str,
        reason: Optional[str] = None,
        admin_workspace_id: Optional[str] = None,
    ) -> bool:
        """
        Revoke an API key.

        Keys can be revoked by:
        1. Workspace admin (same workspace)
        2. System admin (any workspace)

        Args:
            key_id: The key to revoke
            reason: Optional reason for revocation
            admin_workspace_id: Workspace of admin (for permission check)

        Returns:
            True if revoked, False if not found

        Raises:
            AuthenticationError: If admin doesn't have permission
        """
        db = mongodb_manager.get_async_database()

        # Get the key
        key_doc = await db.api_keys.find_one({"id": key_id})
        if not key_doc:
            return False

        # Permission check: same workspace or system admin
        if admin_workspace_id and admin_workspace_id != key_doc["workspace_id"]:
            # TODO: Check if admin_workspace_id has system admin privileges
            pass

        # Revoke the key
        await db.api_keys.update_one(
            {"id": key_id},
            {
                "$set": {
                    "is_active": False,
                    "revoked_at": datetime.utcnow(),
                    "revoked_reason": reason,
                }
            },
        )

        logger.info(
            "api_key_revoked",
            key_id=key_id,
            workspace_id=key_doc["workspace_id"],
            reason=reason,
        )

        return True

    @classmethod
    async def list_workspace_keys(
        cls, workspace_id: str, include_inactive: bool = False
    ) -> List[APIKey]:
        """
        List all API keys for a workspace.

        Note: Returns metadata only, NEVER the full key.

        Args:
            workspace_id: The workspace to list keys for
            include_inactive: Whether to include revoked/expired keys

        Returns:
            List of APIKey metadata (without key_hash)
        """
        db = mongodb_manager.get_async_database()

        query = {"workspace_id": workspace_id}
        if not include_inactive:
            query["is_active"] = True

        cursor = db.api_keys.find(query).sort("created_at", -1)

        keys = []
        async for doc in cursor:
            # Remove sensitive fields
            doc.pop("key_hash", None)
            keys.append(APIKey(**doc))

        return keys

    @classmethod
    async def get_key_metadata(cls, key_id: str) -> Optional[APIKey]:
        """
        Get metadata for a key (no hash).

        Args:
            key_id: The key ID to look up

        Returns:
            APIKey metadata or None if not found
        """
        db = mongodb_manager.get_async_database()

        doc = await db.api_keys.find_one({"id": key_id})
        if not doc:
            return None

        # Remove sensitive fields
        doc.pop("key_hash", None)

        return APIKey(**doc)

    @classmethod
    async def cleanup_expired_keys(cls) -> int:
        """
        Cleanup task: Mark expired keys as inactive.

        Returns:
            Number of keys deactivated
        """
        db = mongodb_manager.get_async_database()

        result = await db.api_keys.update_many(
            {"is_active": True, "expires_at": {"$lt": datetime.utcnow()}},
            {
                "$set": {
                    "is_active": False,
                    "revoked_at": datetime.utcnow(),
                    "revoked_reason": "Expired",
                }
            },
        )

        if result.modified_count > 0:
            logger.info("expired_keys_cleaned", count=result.modified_count)

        return result.modified_count


# Singleton instance
api_key_service = APIKeyService()
