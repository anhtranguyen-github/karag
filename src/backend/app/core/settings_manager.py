import json
import os
from pathlib import Path
from typing import Any, Literal

import structlog
from pydantic import ValidationError as PydanticValidationError
from pydantic_core import PydanticUndefined
from src.backend.app.core.config import karag_settings
from src.backend.app.core.exceptions import ValidationError
from src.backend.app.core.mongodb import mongodb_manager
from src.backend.app.core.schemas import AppSettings

logger = structlog.get_logger(__name__)

# Determine project root and data directory dynamically
_CURRENT_FILE = Path(__file__).resolve()
# We are in src/backend/app/core/settings_manager.py
# Root is 3 levels up: settings_manager.py -> core -> app -> backend -> karag? No, app is under backend?
# Wait, let's check: src/backend/app/core/settings_manager.py
# .parent -> core
# .parent -> app
# .parent -> backend
# .parent -> karag
PROJECT_ROOT = _CURRENT_FILE.parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "src/backend/data"


class SettingsManager:
    def __init__(self, config_file: str = "settings.json", config_path: Path | None = None):
        # INTERNAL ONLY: Controlled mapping to data directory
        if config_path:
            self.config_path = Path(config_path)
        else:
            self.config_path = DATA_DIR / config_file

        self._global_settings: AppSettings = self._load_initial_settings()
        self._settings_cache: dict[str, AppSettings] = {}
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
                with open(self.config_path) as f:
                    settings_data = json.load(f)
            except Exception as e:
                logger.error("settings_load_error", error=str(e))

        # Priority: Env Var > settings.json > defaults in config.py
        # Structured construction from environment variables
        env_overrides = {
            "generation": {
                "provider": os.getenv("LLM_PROVIDER") or karag_settings.LLM_PROVIDER,
                "model": os.getenv("LLM_MODEL") or karag_settings.LLM_MODEL,
            },
            "embedding": {
                "provider": os.getenv("EMBEDDING_PROVIDER") or karag_settings.EMBEDDING_PROVIDER,
                "model": os.getenv("EMBEDDING_MODEL") or karag_settings.EMBEDDING_MODEL,
            },
            "neo4j_uri": os.getenv("NEO4J_URI") or karag_settings.NEO4J_URI,
            "neo4j_user": os.getenv("NEO4J_USER") or karag_settings.NEO4J_USER,
            "neo4j_password": os.getenv("NEO4J_PASSWORD") or karag_settings.NEO4J_PASSWORD,
        }

        # Filter out None values from env_overrides sub-dicts if they are empty or partially filled
        def clean_nested(d):
            if isinstance(d, dict):
                cleaned = {k: clean_nested(v) for k, v in d.items() if v is not None}
                return cleaned if cleaned else None
            return d

        cleaned_overrides = {k: v for k, v in env_overrides.items() if v is not None}

        # Merge: settings_data has priority over defaults, but env_overrides has highest priority
        # We start with defaults (implicit in AppSettings), then apply settings_data, then env_overrides
        # For simplicity, we just pass both to AppSettings which handles the merge via map_flat_fields/updates
        merged_data = settings_data.copy()
        for k, v in cleaned_overrides.items():
            if isinstance(v, dict) and k in merged_data and isinstance(merged_data[k], dict):
                merged_data[k].update(v)
            else:
                merged_data[k] = v

        return AppSettings(**merged_data)

    def get_global_settings(self) -> AppSettings:
        return self._global_settings

    async def get_settings(self, workspace_id: str | None = None) -> AppSettings:
        """Get settings for a specific workspace, falling back to global settings."""
        if not workspace_id or workspace_id == "default":
            return self._global_settings

        # Check cache first
        if workspace_id in self._settings_cache:
            return self._settings_cache[workspace_id]

        try:
            db = mongodb_manager.get_async_database()
            # We store workspace settings in a separate collection or inside the workspace doc
            # Let's use a 'workspace_settings' collection for better isolation
            ws_settings_doc = await db["workspace_settings"].find_one({"workspace_id": workspace_id})

            if not ws_settings_doc:
                self._settings_cache[workspace_id] = self._global_settings
                return self._global_settings

            # Merge workspace settings over global ones
            merged_data = self._global_settings.model_dump()
            # Remove mongo _id and workspace_id from doc before merging
            override_data = {k: v for k, v in ws_settings_doc.items() if k not in ["_id", "workspace_id"]}
            merged_data.update(override_data)

            try:
                settings = AppSettings(**merged_data)
                self._settings_cache[workspace_id] = settings
                return settings
            except PydanticValidationError as e:
                logger.error("settings_schema_mismatch", workspace_id=workspace_id, error=str(e))
                return self._global_settings
        except Exception as e:
            logger.error("settings_fetch_error", workspace_id=workspace_id, error=str(e))
            return self._global_settings

    def get_settings_metadata(self) -> dict[str, Any]:
        """Discover settings metadata from the AppSettings schema recursively."""
        return self._discover_metadata(AppSettings)

    def _discover_metadata(
        self,
        model_class: Any,
        prefix: str = "",
        category: str | None = None,
        mutable: bool = True,
    ) -> dict[str, Any]:
        """Recursively discover fields in Pydantic models."""
        import typing

        from pydantic import BaseModel

        metadata = {}

        # Determine fields to iterate
        fields = model_class.model_fields if hasattr(model_class, "model_fields") else {}

        for name, field in fields.items():
            full_name = f"{prefix}{name}"
            extra = field.json_schema_extra or {}

            # Inherit or override category/mutable
            current_category = extra.get("category", category)
            current_mutable = extra.get("mutable", mutable)

            # Resolve annotation
            annotation = field.annotation
            origin = getattr(annotation, "__origin__", None)

            # Unwrap Optional
            if origin is typing.Union:
                args = [a for a in annotation.__args__ if a is not type(None)]
                if args:
                    annotation = args[0]
                    origin = getattr(annotation, "__origin__", None)

            # Case 1: Nested BaseModel
            if isinstance(annotation, type) and issubclass(annotation, BaseModel):
                # Recurse into nested model
                nested_metadata = self._discover_metadata(
                    annotation,
                    prefix=f"{full_name}.",
                    category=current_category,
                    mutable=current_mutable,
                )
                metadata.update(nested_metadata)
                continue

            # Case 2: Annotated / Union of Models (Strategies)
            # For now, we only show the shared discriminator if it's at the top level
            # but if it's a nested strategy, we might need a more complex UI
            # For this simple discovery, we'll skip the nested internal fields of unions
            # and let the frontend handle "strategy" selection which then toggles others.

            # Skip fields without a category if we are at root
            if not category and "category" not in extra:
                continue

            field_data: dict[str, Any] = {
                "mutable": current_mutable,
                "category": current_category or "General",
                "description": field.description or "",
            }

            if origin is Literal:
                field_data["field_type"] = "select"
                field_data["options"] = [str(arg) for arg in annotation.__args__]
            elif annotation is bool:
                field_data["field_type"] = "bool"
            elif annotation is int:
                field_data["field_type"] = "int"
            elif annotation is float:
                field_data["field_type"] = "float"
            elif annotation is str:
                field_data["field_type"] = "text"
            else:
                field_data["field_type"] = "text"

            if field.default is not None and field.default is not PydanticUndefined:
                field_data["default"] = field.default

            for constraint in field.metadata or []:
                if hasattr(constraint, "ge"):
                    field_data["min"] = constraint.ge
                if hasattr(constraint, "le"):
                    field_data["max"] = constraint.le

            if field_data["field_type"] == "float":
                field_data["step"] = 0.05

            metadata[full_name] = field_data

        return metadata

    def _expand_flat_dict(self, flat_dict: dict[str, Any]) -> dict[str, Any]:
        """Convert a flat dict with dot-notation keys to a nested dict."""
        nested = {}
        for key, value in flat_dict.items():
            parts = key.split(".")
            d = nested
            for part in parts[:-1]:
                if part not in d or not isinstance(d[part], dict):
                    d[part] = {}
                d = d[part]
            d[parts[-1]] = value
        return nested

    async def update_settings(self, updates: dict[str, Any], workspace_id: str | None = None) -> AppSettings:
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
                    params={"immutable_fields": unsupported},
                )

        try:
            if not workspace_id or workspace_id == "default":
                current_data = self._global_settings.model_dump()
                current_data.update(updates)
                self._global_settings = AppSettings(**current_data)
                self._save_global_settings()
                return self._global_settings

            # Validate updates by merging with current and testing against schema
            current = await self.get_settings(workspace_id)
            current_data = current.model_dump()
            expanded_updates = self._expand_flat_dict(updates)

            # Deep merge logic for expanded_updates into current_data
            def deep_update(target, source):
                for k, v in source.items():
                    if isinstance(v, dict) and k in target and isinstance(target[k], dict):
                        deep_update(target[k], v)
                    else:
                        target[k] = v

            deep_update(current_data, expanded_updates)
            AppSettings(**current_data)  # Dry run validation

            db = mongodb_manager.get_async_database()
            await db["workspace_settings"].update_one({"workspace_id": workspace_id}, {"$set": updates}, upsert=True)
            # Invalidate cache
            if workspace_id in self._settings_cache:
                del self._settings_cache[workspace_id]

            return await self.get_settings(workspace_id)
        except PydanticValidationError as e:
            raise ValidationError(message="Invalid settings configuration.", params={"errors": e.errors()})


# Global singleton
settings_manager = SettingsManager()
