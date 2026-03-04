"""
Download manager for RAG evaluation datasets.

Manages dataset downloads with caching, progress tracking, and parallel downloads.
"""

import asyncio
import os
from pathlib import Path
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
from enum import Enum

import structlog

from backend.app.eval.datasets.registry import dataset_registry

logger = structlog.get_logger(__name__)


class DownloadStatus(Enum):
    """Status of a dataset download."""

    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    CACHED = "cached"


@dataclass
class DownloadTask:
    """Represents a download task."""

    dataset_name: str
    status: DownloadStatus = DownloadStatus.PENDING
    progress: float = 0.0
    error: Optional[str] = None
    local_path: Optional[Path] = None


class DownloadManager:
    """
    Manages downloading and caching of evaluation datasets.

    Features:
    - Parallel downloads with concurrency control
    - Progress tracking
    - Resume capability
    - Cache management

    Example:
        manager = DownloadManager()

        # Download single dataset
        path = await manager.download("ms_marco")

        # Download multiple datasets
        results = await manager.download_batch(["ms_marco", "natural_questions"])

        # Check status
        status = manager.get_status("ms_marco")
    """

    def __init__(
        self,
        cache_dir: Optional[Union[str, Path]] = None,
        max_concurrent: int = 3,
    ):
        """
        Initialize download manager.

        Args:
            cache_dir: Base directory for caching datasets
            max_concurrent: Maximum concurrent downloads
        """
        if cache_dir:
            self.cache_dir = Path(cache_dir)
        else:
            # Allow override via environment variable for restricted environments
            cache_path = os.environ.get("KARAG_CACHE_DIR")
            if cache_path:
                self.cache_dir = Path(cache_path)
            else:
                self.cache_dir = Path.home() / ".karag" / "datasets"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.max_concurrent = max_concurrent
        self._tasks: Dict[str, DownloadTask] = {}
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self.logger = logger

    async def download(
        self, dataset_name: str, force: bool = False, **loader_kwargs
    ) -> Path:
        """
        Download a single dataset.

        Args:
            dataset_name: Name of registered dataset
            force: Force re-download even if cached
            **loader_kwargs: Additional arguments for loader

        Returns:
            Path to downloaded dataset

        Raises:
            KeyError: If dataset not registered
            Exception: If download fails
        """
        async with self._semaphore:
            # Check cache
            if not force and self.is_cached(dataset_name):
                self.logger.info("dataset_cached", dataset=dataset_name)
                task = DownloadTask(
                    dataset_name=dataset_name,
                    status=DownloadStatus.CACHED,
                    local_path=self._get_dataset_path(dataset_name),
                )
                self._tasks[dataset_name] = task
                return task.local_path

            # Create task
            task = DownloadTask(
                dataset_name=dataset_name,
                status=DownloadStatus.DOWNLOADING,
            )
            self._tasks[dataset_name] = task

            try:
                self.logger.info("starting_download", dataset=dataset_name)

                # Get loader
                loader = dataset_registry.get(
                    dataset_name, cache_dir=self.cache_dir, **loader_kwargs
                )

                # Download
                path = await loader.download(force=force)

                # Update task
                task.status = DownloadStatus.COMPLETED
                task.local_path = path
                task.progress = 100.0

                self.logger.info(
                    "download_completed", dataset=dataset_name, path=str(path)
                )

                return path

            except Exception as e:
                task.status = DownloadStatus.FAILED
                task.error = str(e)
                self.logger.error("download_failed", dataset=dataset_name, error=str(e))
                raise

    async def download_batch(
        self, dataset_names: List[str], force: bool = False, **loader_kwargs
    ) -> Dict[str, Union[Path, Exception]]:
        """
        Download multiple datasets in parallel.

        Args:
            dataset_names: List of dataset names
            force: Force re-download
            **loader_kwargs: Additional arguments for loaders

        Returns:
            Dictionary mapping dataset names to paths or exceptions
        """
        tasks = [
            self._download_with_error_handling(name, force, **loader_kwargs)
            for name in dataset_names
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        return {
            name: result if not isinstance(result, Exception) else result
            for name, result in zip(dataset_names, results)
        }

    async def _download_with_error_handling(
        self, dataset_name: str, force: bool = False, **loader_kwargs
    ) -> Union[Path, Exception]:
        """Download with error handling."""
        try:
            return await self.download(dataset_name, force, **loader_kwargs)
        except Exception as e:
            return e

    def is_cached(self, dataset_name: str) -> bool:
        """Check if a dataset is cached locally."""
        try:
            loader = dataset_registry.get(dataset_name, cache_dir=self.cache_dir)
            return loader.is_cached()
        except KeyError:
            return False

    def get_status(self, dataset_name: str) -> Optional[DownloadStatus]:
        """Get download status of a dataset."""
        task = self._tasks.get(dataset_name)
        return task.status if task else None

    def get_all_statuses(self) -> Dict[str, DownloadStatus]:
        """Get statuses of all tracked downloads."""
        return {name: task.status for name, task in self._tasks.items()}

    def _get_dataset_path(self, dataset_name: str) -> Path:
        """Get expected path for a dataset."""
        return self.cache_dir / dataset_name

    def clear_cache(self, dataset_name: Optional[str] = None) -> None:
        """
        Clear cached datasets.

        Args:
            dataset_name: Specific dataset to clear, or None for all
        """
        if dataset_name:
            path = self._get_dataset_path(dataset_name)
            if path.exists():
                import shutil

                shutil.rmtree(path)
                self.logger.info("cache_cleared", dataset=dataset_name)
        else:
            # Clear all
            for path in self.cache_dir.iterdir():
                if path.is_dir():
                    import shutil

                    shutil.rmtree(path)
            self.logger.info("all_cache_cleared")

    def get_cache_size(self) -> int:
        """Get total cache size in bytes."""
        total_size = 0
        for dirpath, dirnames, filenames in self.cache_dir.walk():
            for f in filenames:
                fp = dirpath / f
                total_size += fp.stat().st_size
        return total_size

    def list_cached(self) -> List[str]:
        """List all cached datasets."""
        cached = []
        for path in self.cache_dir.iterdir():
            if path.is_dir() and any(path.iterdir()):
                cached.append(path.name)
        return cached


# Global download manager instance
download_manager = DownloadManager()
