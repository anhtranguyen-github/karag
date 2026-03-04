"""
Dataset loaders and downloaders for RAG evaluation.

Supports both English and Vietnamese datasets.
"""

from backend.app.eval.datasets.base import BaseDatasetLoader, DatasetEntry, DatasetSplit
from backend.app.eval.datasets.registry import DatasetRegistry, dataset_registry
from backend.app.eval.datasets.huggingface_loader import HuggingFaceDatasetLoader
from backend.app.eval.datasets.download_manager import DownloadManager

__all__ = [
    "BaseDatasetLoader",
    "DatasetEntry",
    "DatasetSplit",
    "DatasetRegistry",
    "dataset_registry",
    "HuggingFaceDatasetLoader",
    "DownloadManager",
]
