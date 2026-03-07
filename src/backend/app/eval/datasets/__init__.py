"""
Dataset loaders and downloaders for RAG evaluation.

Supports both English and Vietnamese datasets.
"""

from src.backend.app.eval.datasets.base import BaseDatasetLoader, DatasetEntry, DatasetSplit
from src.backend.app.eval.datasets.download_manager import DownloadManager
from src.backend.app.eval.datasets.huggingface_loader import HuggingFaceDatasetLoader
from src.backend.app.eval.datasets.registry import DatasetRegistry, dataset_registry

__all__ = [
    "BaseDatasetLoader",
    "DatasetEntry",
    "DatasetSplit",
    "DatasetRegistry",
    "dataset_registry",
    "HuggingFaceDatasetLoader",
    "DownloadManager",
]
