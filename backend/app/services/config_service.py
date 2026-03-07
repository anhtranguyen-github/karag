"""
Configuration Service - Block 4: Control Plane

Provides layered configuration management:
- System config (operator-only)
- Workspace config (restricted)
- Request config (clamped)

PRECEDENCE: Request (clamped) > Workspace > System
"""

from datetime import datetime
from typing import Any

import structlog
from backend.app.core.exceptions import ValidationError
from backend.app.core.mongodb import mongodb_manager
from backend.app.schemas.baas import (
    RAGConfig,
    RateLimitConfig,
    RequestConfig,
    SystemConfig,
    WorkspaceConfig,
)

logger = structlog.get_logger(__name__)


class ConfigService:
    """
    Service for configuration layer management.

    CONFIGURATION PRECEDENCE:
    1. Request parameters (highest, but clamped by workspace limits)
    2. Workspace settings (stored in MongoDB)
    3. System defaults (from environment/config)

    MUTABILITY:
    - Runtime mutable: RAG config, rate limits
    - Restart required: embedding dimensions, allowed models list
    """

    SYSTEM_CONFIG_ID = "system"

    # Default system configuration
    DEFAULT_SYSTEM_CONFIG = SystemConfig(
        allowed_models=["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        max_context_window=128000,
        max_tokens_per_request=4096,
        default_rag_config=RAGConfig(),
        enable_global_storage=True,
        enable_workspace_sharing=False,
        request_timeout_seconds=60,
        max_upload_size_mb=100,
        default_embedding_model="text-embedding-3-small",
        default_embedding_dimensions=1536,
    )

    @classmethod
    async def initialize_system_config(cls) -> SystemConfig:
        """
        Ensure system config exists in database.

        Called on system startup. Creates default if missing.
        """
        db = mongodb_manager.get_async_database()

        existing = await db.system_config.find_one({"id": cls.SYSTEM_CONFIG_ID})
        if existing:
            return SystemConfig(**existing)

        # Create default system config
        config = cls.DEFAULT_SYSTEM_CONFIG
        config_doc = config.model_dump()
        config_doc["id"] = cls.SYSTEM_CONFIG_ID
        config_doc["created_at"] = datetime.utcnow()
        config_doc["updated_at"] = datetime.utcnow()

        await db.system_config.insert_one(config_doc)

        logger.info("system_config_initialized")

        return config

    @classmethod
    async def get_system_config(cls) -> SystemConfig:
        """
        Get system-level configuration (operator-only).

        Returns:
            SystemConfig with current settings
        """
        db = mongodb_manager.get_async_database()

        config_doc = await db.system_config.find_one({"id": cls.SYSTEM_CONFIG_ID})
        if config_doc:
            return SystemConfig(**config_doc)

        # Initialize if missing
        return await cls.initialize_system_config()

    @classmethod
    async def update_system_config(cls, updates: dict[str, Any]) -> SystemConfig:
        """
        Update system configuration (operator-only).

        Some changes may require restart.

        Args:
            updates: Dictionary of fields to update

        Returns:
            Updated SystemConfig
        """
        db = mongodb_manager.get_async_database()

        # Get current config
        current = await cls.get_system_config()

        # Identify restart-required changes
        restart_required_fields = [
            "max_context_window",
            "default_embedding_model",
            "default_embedding_dimensions",
        ]

        needs_restart = any(f in updates for f in restart_required_fields)

        if needs_restart:
            logger.warning(
                "system_config_restart_required",
                changed_fields=[f for f in restart_required_fields if f in updates],
            )

        # Merge updates
        current_dict = current.model_dump()
        current_dict.update(updates)
        current_dict["updated_at"] = datetime.utcnow()

        # Validate new config
        new_config = SystemConfig(**current_dict)

        # Save to database
        await db.system_config.update_one({"id": cls.SYSTEM_CONFIG_ID}, {"$set": current_dict}, upsert=True)

        logger.info(
            "system_config_updated",
            needs_restart=needs_restart,
            updated_fields=list(updates.keys()),
        )

        return new_config

    @classmethod
    async def get_workspace_config(cls, workspace_id: str) -> WorkspaceConfig:
        """
        Get workspace-level configuration.

        If no workspace-specific config exists, returns defaults
        based on system configuration.

        Args:
            workspace_id: The workspace to get config for

        Returns:
            WorkspaceConfig
        """
        db = mongodb_manager.get_async_database()

        config_doc = await db.workspace_configs.find_one({"workspace_id": workspace_id})

        if config_doc:
            return WorkspaceConfig(**config_doc)

        # Return default config
        system_config = await cls.get_system_config()

        return WorkspaceConfig(
            workspace_id=workspace_id,
            enabled_datasets=["default"],
            default_dataset_id="default",
            rag_config=system_config.default_rag_config,
            default_temperature=0.7,
            default_max_tokens=1024,
            default_model=system_config.allowed_models[0] if system_config.allowed_models else "gpt-4o",
            rate_limits=RateLimitConfig(),
        )

    @classmethod
    async def update_workspace_config(cls, workspace_id: str, updates: dict[str, Any]) -> WorkspaceConfig:
        """
        Update workspace configuration.

        Changes are clamped to system limits.

        Args:
            workspace_id: The workspace to update
            updates: Dictionary of fields to update

        Returns:
            Updated WorkspaceConfig
        """
        db = mongodb_manager.get_async_database()

        # Get current config
        current = await cls.get_workspace_config(workspace_id)
        system_config = await cls.get_system_config()

        # Validate and clamp updates
        clamped_updates = cls._clamp_workspace_updates(updates, system_config)

        # Merge with current
        current_dict = current.model_dump()
        current_dict.update(clamped_updates)
        current_dict["updated_at"] = datetime.utcnow()

        # Validate
        new_config = WorkspaceConfig(**current_dict)

        # Save
        await db.workspace_configs.update_one({"workspace_id": workspace_id}, {"$set": current_dict}, upsert=True)

        logger.info(
            "workspace_config_updated",
            workspace_id=workspace_id,
            updated_fields=list(clamped_updates.keys()),
        )

        return new_config

    @classmethod
    def _clamp_workspace_updates(cls, updates: dict[str, Any], system_config: SystemConfig) -> dict[str, Any]:
        """
        Clamp workspace config updates to system limits.

        Args:
            updates: Requested updates
            system_config: System configuration (source of limits)

        Returns:
            Clamped updates
        """
        clamped = {}

        # Clamp temperature
        if "default_temperature" in updates:
            temp = updates["default_temperature"]
            clamped["default_temperature"] = max(0.0, min(2.0, temp))

        # Clamp max_tokens
        if "default_max_tokens" in updates:
            tokens = updates["default_max_tokens"]
            clamped["default_max_tokens"] = max(1, min(system_config.max_tokens_per_request, tokens))

        # Validate model against allowed list
        if "default_model" in updates:
            model = updates["default_model"]
            if model not in system_config.allowed_models:
                logger.warning(
                    "model_not_allowed",
                    requested_model=model,
                    allowed_models=system_config.allowed_models,
                )
                raise ValidationError(f"Model '{model}' is not allowed. Allowed models: {system_config.allowed_models}")
            clamped["default_model"] = model

        # Pass through other updates (RAG config, storage settings)
        for key in ["enabled_datasets", "default_dataset_id", "rag_config", "rate_limits"]:
            if key in updates:
                clamped[key] = updates[key]

        return clamped

    @classmethod
    async def resolve_request_config(
        cls, workspace_id: str, request_config: RequestConfig | None = None
    ) -> dict[str, Any]:
        """
        Resolve final configuration for a request.

        PRECEDENCE:
        1. Request parameters (clamped)
        2. Workspace settings
        3. System defaults

        Args:
            workspace_id: The workspace making the request
            request_config: Optional request-level overrides

        Returns:
            Resolved configuration dictionary
        """
        # Start with system defaults
        system_config = await cls.get_system_config()
        resolved = {
            "model": system_config.allowed_models[0] if system_config.allowed_models else "gpt-4o",
            "temperature": 0.7,
            "top_p": 1.0,
            "max_tokens": min(1024, system_config.max_tokens_per_request),
            "stream": True,
            "rag_config": system_config.default_rag_config,
        }

        # Apply workspace settings
        workspace_config = await cls.get_workspace_config(workspace_id)
        resolved.update(
            {
                "model": workspace_config.default_model,
                "temperature": workspace_config.default_temperature,
                "max_tokens": min(
                    workspace_config.default_max_tokens,
                    system_config.max_tokens_per_request,
                ),
                "rag_config": workspace_config.rag_config,
                "enabled_datasets": workspace_config.enabled_datasets,
                "default_dataset_id": workspace_config.default_dataset_id,
            }
        )

        # Apply and clamp request settings
        if request_config:
            if request_config.temperature is not None:
                resolved["temperature"] = max(0.0, min(2.0, request_config.temperature))

            if request_config.top_p is not None:
                resolved["top_p"] = max(0.0, min(1.0, request_config.top_p))

            if request_config.max_tokens is not None:
                resolved["max_tokens"] = min(request_config.max_tokens, system_config.max_tokens_per_request)

            resolved["stream"] = request_config.stream

            # RAG overrides
            if request_config.use_rag is not None:
                resolved["use_rag"] = request_config.use_rag
            if request_config.dataset_id is not None:
                resolved["dataset_id"] = request_config.dataset_id
            if request_config.top_k is not None:
                resolved["rag_config"].top_k = min(50, max(1, request_config.top_k))

        return resolved

    @classmethod
    async def validate_model_access(cls, workspace_id: str, model: str) -> bool:
        """
        Check if a model is allowed for a workspace.

        Args:
            workspace_id: The workspace
            model: The model to check

        Returns:
            True if allowed
        """
        system_config = await cls.get_system_config()
        return model in system_config.allowed_models

    @classmethod
    def get_allowed_models(cls, system_config: SystemConfig | None = None) -> list:
        """
        Get list of allowed models.

        Args:
            system_config: Optional cached system config

        Returns:
            List of model names
        """
        if system_config is None:
            # Use default for sync context
            return cls.DEFAULT_SYSTEM_CONFIG.allowed_models
        return system_config.allowed_models


# Singleton instance
config_service = ConfigService()
