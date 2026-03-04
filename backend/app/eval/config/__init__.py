"""
Configuration management for RAG evaluation.

Provides YAML/JSON configurations for datasets, metrics, and benchmarks.
"""

from backend.app.eval.config.loader import ConfigLoader, load_dataset_config, load_metrics_config

__all__ = [
    "ConfigLoader",
    "load_dataset_config",
    "load_metrics_config",
]