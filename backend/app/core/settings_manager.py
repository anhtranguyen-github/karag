import os
import json
import structlog
from pathlib import Path
from typing import Dict, Any, Optional, Literal
from backend.app.core.schemas import AppSettings
from backend.app.core.config import ai_settings
from backend.app.core.mongodb import mongodb_manager

from pydantic import ValidationError as PydanticValidationError
from backend.app.core.exceptions import ValidationError

logger = structlog.get_logger(__name__)

class SettingsManager:
    def __init__(self, config_path: str = "backend/data/settings.json"):
        self.config_path = Path(config_path)
        self._global_settings: AppSettings = self._load_initial_settings()
        # Ensure fallback file exists
        if not self.config_path.exists():
            self._save_global_settings()

    def _save_global_settings(self):
        """Save global settings to disk."""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w") as f:
                json.dump(self._global_settings.model_dump(), f, indent=4)
        except Exception as e:
            logger.error("settings_save_error", error=str(e))

    def _load_initial_settings(self) -> AppSettings:
        """Load global settings from JSON, allowing environment variable overrides."""
        settings_data = {}
        if self.config_path.exists():
            try:
                with open(self.config_path, "r") as f:
                    settings_data = json.load(f)
            except Exception as e:
                logger.error("settings_load_error", error=str(e))
        
        # Priority: Env Var > settings.json > defaults in config.py
        # Check for environment overrides specifically
        env_overrides = {
            "llm_provider": os.getenv("LLM_PROVIDER"),
            "llm_model": os.getenv("LLM_MODEL"),
            "embedding_provider": os.getenv("EMBEDDING_PROVIDER"),
            "embedding_model": os.getenv("EMBEDDING_MODEL"),
        }
        
        # Merge: settings_data has priority over config defaults, but env_overrides has highest priority
        merged_data = {
            "llm_provider": ai_settings.LLM_PROVIDER,
            "llm_model": ai_settings.LLM_MODEL,
            "embedding_provider": ai_settings.EMBEDDING_PROVIDER,
            "embedding_model": ai_settings.EMBEDDING_MODEL,
        }
        merged_data.update(settings_data)
        merged_data.update({k: v for k, v in env_overrides.items() if v is not None})
        
        return AppSettings(**merged_data)

    def get_global_settings(self) -> AppSettings:
        return self._global_settings

    async def get_settings(self, workspace_id: Optional[str] = None) -> AppSettings:
        """Get settings for a specific workspace, falling back to global settings."""
        if not workspace_id or workspace_id == "default":
            return self._global_settings

        try:
            db = mongodb_manager.get_async_database()
            # We store workspace settings in a separate collection or inside the workspace doc
            # Let's use a 'workspace_settings' collection for better isolation
            ws_settings_doc = await db["workspace_settings"].find_one({"workspace_id": workspace_id})
            
            if not ws_settings_doc:
                return self._global_settings

            # Merge workspace settings over global ones
            merged_data = self._global_settings.model_dump()
            # Remove mongo _id and workspace_id from doc before merging
            override_data = {k: v for k, v in ws_settings_doc.items() if k not in ["_id", "workspace_id"]}
            merged_data.update(override_data)
            
            try:
                return AppSettings(**merged_data)
            except PydanticValidationError as e:
                logger.error("settings_schema_mismatch", workspace_id=workspace_id, error=str(e))
                return self._global_settings
        except Exception as e:
            logger.error("settings_fetch_error", workspace_id=workspace_id, error=str(e))
            return self._global_settings

    def get_settings_metadata(self) -> Dict[str, Any]:
        """Discover settings metadata from the AppSettings schema."""
        metadata = {}
        for name, field in AppSettings.model_fields.items():
            extra = field.json_schema_extra or {}
            field_data = {
                "mutable": extra.get("mutable", True),
                "category": extra.get("category", "General"),
                "description": field.description or ""
            }
            
            # Extract options from Literal if present
            # Accessing the annotation of Pydantic V2 fields
            annotation = field.annotation
            if hasattr(annotation, "__origin__") and annotation.__origin__ is Literal:
                field_data["options"] = list(annotation.__args__)
            
            metadata[name] = field_data
        return metadata

    async def update_settings(self, updates: Dict[str, Any], workspace_id: Optional[str] = None) -> AppSettings:
        """Update settings for a workspace or global."""
        
        # 1. Audit: Prevent modification of core parameters based on schema metadata
        metadata = self.get_settings_metadata()
        
        if workspace_id and workspace_id != "default":
            unsupported = []
            for key in updates:
                if key in metadata and not metadata[key]["mutable"]:
                    unsupported.append(key)
            
            if unsupported:
                raise ValidationError(
                    message=f"The following parameters are immutable for existing workspaces: {', '.join(unsupported)}. These require workspace re-creation or structural rebuilds.",
                    params={"immutable_fields": unsupported}
                )

        try:
            if not workspace_id or workspace_id == "default":
                current_data = self._global_settings.model_dump()
                current_data.update(updates)
                self._global_settings = AppSettings(**current_data)
                self._save_global_settings()
                return self._global_settings
            else:
                # Validate updates by merging with current and testing against schema
                current = await self.get_settings(workspace_id)
                current_data = current.model_dump()
                current_data.update(updates)
                AppSettings(**current_data) # Dry run validation
                
                db = mongodb_manager.get_async_database()
                await db["workspace_settings"].update_one(
                    {"workspace_id": workspace_id},
                    {"$set": updates},
                    upsert=True
                )
                return await self.get_settings(workspace_id)
        except PydanticValidationError as e:
            raise ValidationError(
                message="Invalid settings configuration.",
                params={"errors": e.errors()}
            )

# Global singleton
settings_manager = SettingsManager()
