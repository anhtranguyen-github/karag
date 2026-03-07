from pathlib import Path
from typing import Any

import structlog
import yaml

logger = structlog.get_logger(__name__)


class PromptManager:
    """
    Central manager for LLM prompts.
    Supports versioning and hot-reloading (in dev).
    """

    def __init__(self, registry_path: Path | None = None):
        self.registry_path = registry_path or Path(__file__).parent / "prompts.yaml"
        self._registry: dict[str, Any] = {}
        self.load_registry()

    def load_registry(self):
        try:
            with open(self.registry_path) as f:
                self._registry = yaml.safe_load(f)
            logger.info("prompt_registry_loaded", path=str(self.registry_path))
        except Exception as e:
            logger.error("prompt_registry_load_failed", error=str(e))
            raise

    def get_prompt(self, key: str, version: str = "v1") -> Any:
        """
        Retrieve a specific prompt by key and version.
        Key example: 'rag_system.system'
        """
        parts = key.split(".")
        try:
            current = self._registry
            for part in parts:
                if part == parts[0]:  # First part is the task name
                    current = current[part][version]
                else:
                    current = current[part]
            return current
        except KeyError:
            logger.warning("prompt_not_found", key=key, version=version)
            return None

    def get_all_prompts(self) -> dict[str, Any]:
        """Return the entire registry for admin inspection."""
        return self._registry

    def format_prompt(self, template: str, **kwargs) -> str:
        """Format a template string with provided variables."""
        return template.format(**kwargs)


# Global Singleton
prompt_manager = PromptManager()
