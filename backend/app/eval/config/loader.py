"""
Configuration loader for RAG evaluation.

Loads and manages dataset, metric, and benchmark configurations.
"""

from pathlib import Path
from typing import Any, Dict, Optional, Union

import structlog
import yaml

logger = structlog.get_logger(__name__)


class ConfigLoader:
    """
    Loads configuration files for evaluation.

    Supports YAML and JSON formats.
    """

    def __init__(self, config_dir: Optional[Union[str, Path]] = None):
        """
        Initialize config loader.

        Args:
            config_dir: Directory containing config files
        """
        if config_dir is None:
            config_dir = Path(__file__).parent
        self.config_dir = Path(config_dir)
        self._cache: Dict[str, Any] = {}
        self.logger = logger

    def load(self, filename: str) -> Dict[str, Any]:
        """
        Load a configuration file.

        Args:
            filename: Name of config file (e.g., "datasets.yaml")

        Returns:
            Configuration dictionary
        """
        if filename in self._cache:
            return self._cache[filename]

        filepath = self.config_dir / filename

        if not filepath.exists():
            raise FileNotFoundError(f"Config file not found: {filepath}")

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                if filepath.suffix in [".yaml", ".yml"]:
                    config = yaml.safe_load(f)
                elif filepath.suffix == ".json":
                    import json

                    config = json.load(f)
                else:
                    raise ValueError(f"Unsupported config format: {filepath.suffix}")

            self._cache[filename] = config
            self.logger.info("config_loaded", filename=filename)
            return config

        except Exception as e:
            self.logger.error("config_load_failed", filename=filename, error=str(e))
            raise

    def get_dataset_config(self, dataset_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific dataset."""
        config = self.load("datasets.yaml")
        return config.get("datasets", {}).get(dataset_name)

    def get_metrics_config(self) -> Dict[str, Any]:
        """Get metrics configuration."""
        return self.load("metrics.yaml")

    def get_benchmark_config(self, benchmark_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific benchmark."""
        config = self.load("benchmarks.yaml")
        return config.get("benchmarks", {}).get(benchmark_name)


# Global config loader instance
_config_loader: Optional[ConfigLoader] = None


def get_config_loader() -> ConfigLoader:
    """Get global config loader instance."""
    global _config_loader
    if _config_loader is None:
        _config_loader = ConfigLoader()
    return _config_loader


def load_dataset_config(dataset_name: str) -> Optional[Dict[str, Any]]:
    """Convenience function to load dataset config."""
    return get_config_loader().get_dataset_config(dataset_name)


def load_metrics_config() -> Dict[str, Any]:
    """Convenience function to load metrics config."""
    return get_config_loader().get_metrics_config()
