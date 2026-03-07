"""
Base dataset loader for RAG evaluation.

Provides abstract base class and common functionality for all dataset loaders.
"""

from abc import ABC, abstractmethod
from collections.abc import Iterator
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


class DatasetSplit(Enum):
    """Dataset split types."""

    TRAIN = "train"
    VALIDATION = "validation"
    TEST = "test"
    ALL = "all"


@dataclass
class DatasetEntry:
    """
    A single entry in an evaluation dataset.

    This represents one test case with all relevant information for RAG evaluation.
    """

    id: str
    query: str
    answer: str | None = None
    contexts: list[str] = field(default_factory=list)
    ground_truth_documents: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    # For datasets with multiple valid answers
    alternative_answers: list[str] = field(default_factory=list)

    # Dataset source information
    dataset_name: str | None = None
    language: str | None = None
    domain: str | None = None  # e.g., "medical", "finance", "general"

    # For multi-hop or complex reasoning datasets
    reasoning_path: list[str] | None = None
    supporting_facts: list[str] = field(default_factory=list)

    def __post_init__(self):
        """Ensure proper initialization of mutable defaults."""
        if self.contexts is None:
            self.contexts = []
        if self.ground_truth_documents is None:
            self.ground_truth_documents = []
        if self.metadata is None:
            self.metadata = {}
        if self.alternative_answers is None:
            self.alternative_answers = []
        if self.supporting_facts is None:
            self.supporting_facts = []


@dataclass
class DatasetInfo:
    """Metadata about a dataset."""

    name: str
    description: str
    language: str  # "en", "vi", "multilingual"
    task_type: str  # "qa", "retrieval", "summarization"
    num_samples: int | None = None
    domains: list[str] = field(default_factory=list)
    has_ground_truth_context: bool = True
    has_ground_truth_answer: bool = True
    citation: str | None = None
    license: str | None = None
    version: str | None = None
    url: str | None = None

    def __post_init__(self):
        if self.domains is None:
            self.domains = []


class BaseDatasetLoader(ABC):
    """
        Abstract base class for dataset loaders.

        All dataset loaders must inherit from this class and implement
    the required abstract methods.

        Example:
            class MyDatasetLoader(BaseDatasetLoader):
                def __init__(self, cache_dir: str = None):
                    super().__init__("my_dataset", cache_dir)

                def load(self, split: DatasetSplit = DatasetSplit.TEST) -> Iterator[DatasetEntry]:
                    # Implementation
                    pass

                def info(self) -> DatasetInfo:
                    # Implementation
                    pass
    """

    def __init__(self, name: str, cache_dir: str | Path | None = None):
        """
        Initialize the dataset loader.

        Args:
            name: Unique name for this dataset
            cache_dir: Directory to cache downloaded datasets
        """
        self.name = name
        self.cache_dir = Path(cache_dir) if cache_dir else Path.home() / ".karag" / "datasets"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._info: DatasetInfo | None = None
        self.logger = logger.bind(dataset=name)

    @abstractmethod
    async def load(
        self,
        split: DatasetSplit = DatasetSplit.TEST,
        max_samples: int | None = None,
        **kwargs,
    ) -> Iterator[DatasetEntry]:
        """
        Load the dataset.

        Args:
            split: Which split to load (train/validation/test/all)
            max_samples: Maximum number of samples to load (None for all)
            **kwargs: Additional loader-specific arguments

        Returns:
            Iterator over dataset entries
        """
        pass

    @abstractmethod
    def info(self) -> DatasetInfo:
        """
        Get dataset metadata.

        Returns:
            DatasetInfo object with metadata
        """
        pass

    async def download(self, force: bool = False) -> Path:
        """
        Download the dataset if not already cached.

        Args:
            force: Force re-download even if cached

        Returns:
            Path to downloaded dataset
        """
        # Default implementation - subclasses can override
        self.logger.info("download_not_implemented", dataset=self.name)
        return self.cache_dir / self.name

    def is_cached(self) -> bool:
        """Check if dataset is already cached locally."""
        dataset_path = self.cache_dir / self.name
        return dataset_path.exists() and any(dataset_path.iterdir())

    async def validate(self) -> bool:
        """
        Validate that the dataset can be loaded correctly.

        Returns:
            True if valid, False otherwise
        """
        try:
            count = 0
            async for entry in self.load(max_samples=5):
                if not isinstance(entry, DatasetEntry):
                    return False
                count += 1
            return count > 0
        except Exception as e:
            self.logger.error("validation_failed", error=str(e))
            return False

    def get_statistics(self) -> dict[str, Any]:
        """
        Get basic statistics about the dataset.

        Returns:
            Dictionary with statistics
        """
        info = self.info()
        return {
            "name": info.name,
            "language": info.language,
            "task_type": info.task_type,
            "num_samples": info.num_samples,
            "domains": info.domains,
            "cached": self.is_cached(),
        }

    def _generate_id(self, index: int, prefix: str = "") -> str:
        """Generate a unique ID for a dataset entry."""
        return f"{self.name}_{prefix}_{index:06d}"
