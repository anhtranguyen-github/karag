"""
HuggingFace dataset loader for RAG evaluation.

Supports loading datasets from HuggingFace Hub with standardized
column mapping for different dataset formats.
"""

from collections.abc import AsyncIterator, Callable
from pathlib import Path
from typing import Any

import structlog
from backend.app.eval.datasets.base import (
    BaseDatasetLoader,
    DatasetEntry,
    DatasetInfo,
    DatasetSplit,
)

logger = structlog.get_logger(__name__)


class HuggingFaceDatasetLoader(BaseDatasetLoader):
    """
    Generic HuggingFace dataset loader.

    Supports loading any HuggingFace dataset with configurable column mapping.
    Works with popular RAG evaluation datasets like MS MARCO, Natural Questions,
    HotpotQA, and Vietnamese datasets like UIT-ViQuAD.

    Example:
        loader = HuggingFaceDatasetLoader(
            name="ms_marco",
            dataset_path="microsoft/ms_marco",
            config_name="v1.1",
            column_mapping={
                "query": "query",
                "answer": "answers",
                "context": "passages",
            }
        )

        for entry in loader.load():
            print(entry.query, entry.answer)
    """

    def __init__(
        self,
        name: str,
        dataset_path: str,
        cache_dir: str | Path | None = None,
        config_name: str | None = None,
        column_mapping: dict[str, str] | None = None,
        split_mapping: dict[DatasetSplit, str] | None = None,
        dataset_info: DatasetInfo | None = None,
        preprocess_fn: Callable | None = None,
    ):
        """
        Initialize HuggingFace dataset loader.

        Args:
            name: Unique name for this dataset
            dataset_path: Path on HuggingFace Hub (e.g., "microsoft/ms_marco")
            cache_dir: Local cache directory
            config_name: Dataset configuration name
            column_mapping: Map from standard fields to dataset columns
                Standard fields: query, answer, contexts, ground_truth_documents
            split_mapping: Map from DatasetSplit to dataset split names
            dataset_info: Dataset metadata
            preprocess_fn: Optional function to preprocess each example
        """
        super().__init__(name, cache_dir)
        self.dataset_path = dataset_path
        self.config_name = config_name
        self.column_mapping = column_mapping or {
            "query": "question",
            "answer": "answer",
            "contexts": "context",
            "ground_truth_documents": "positive_passages",
        }
        self.split_mapping = split_mapping or {
            DatasetSplit.TRAIN: "train",
            DatasetSplit.VALIDATION: "validation",
            DatasetSplit.TEST: "test",
        }
        self._dataset_info = dataset_info
        self.preprocess_fn = preprocess_fn
        self._datasets_lib = None

    def _get_datasets_lib(self):
        """Lazy import datasets library."""
        if self._datasets_lib is None:
            try:
                import datasets

                self._datasets_lib = datasets
            except ImportError:
                raise ImportError("datasets library required. Install with: pip install datasets")
        return self._datasets_lib

    def info(self) -> DatasetInfo:
        """Get dataset metadata."""
        if self._dataset_info:
            return self._dataset_info

        # Try to load from HuggingFace
        try:
            datasets = self._get_datasets_lib()
            info = datasets.load_dataset_builder(self.dataset_path, self.config_name).info

            return DatasetInfo(
                name=self.name,
                description=info.description or "",
                language="en",  # Default assumption
                task_type="qa",
                num_samples=info.splits.get("test", info.splits.get("train", {})).num_examples if info.splits else None,
                citation=info.citation,
                license=str(info.license) if info.license else None,
                version=str(info.version) if info.version else None,
            )
        except Exception as e:
            self.logger.warning("failed_to_load_info", error=str(e))
            return DatasetInfo(
                name=self.name,
                description=f"Dataset from {self.dataset_path}",
                language="unknown",
                task_type="qa",
            )

    async def download(self, force: bool = False) -> Path:
        """
        Download and cache the dataset from HuggingFace Hub.

        Args:
            force: Force re-download even if cached

        Returns:
            Path to the cached dataset directory
        """
        datasets = self._get_datasets_lib()

        # Build cache path
        dataset_cache_dir = self.cache_dir / self.name.replace("/", "_")

        if force and dataset_cache_dir.exists():
            import shutil

            shutil.rmtree(dataset_cache_dir)

        # Load dataset to trigger download
        try:
            _ = datasets.load_dataset(  # nosec B615
                self.dataset_path,
                self.config_name,
                cache_dir=str(dataset_cache_dir),
                download_mode="force_redownload" if force else "reuse_cache_if_exists",
            )
            self.logger.info("dataset_downloaded", dataset=self.name, path=str(dataset_cache_dir))
            return dataset_cache_dir
        except Exception as e:
            self.logger.error("download_failed", dataset=self.name, error=str(e))
            raise

    async def load(
        self,
        split: DatasetSplit = DatasetSplit.TEST,
        max_samples: int | None = None,
        streaming: bool = False,
        **kwargs,
    ) -> AsyncIterator[DatasetEntry]:
        """
        Load dataset from HuggingFace Hub.

        Args:
            split: Which split to load
            max_samples: Maximum number of samples
            streaming: Whether to stream the dataset
            **kwargs: Additional arguments for datasets.load_dataset

        Yields:
            DatasetEntry objects
        """
        datasets = self._get_datasets_lib()

        # Determine split name
        split_name = self.split_mapping.get(split, split.value)
        if split == DatasetSplit.ALL:
            split_name = None  # Load all splits

        self.logger.info(
            "loading_dataset",
            dataset=self.dataset_path,
            split=split_name,
            streaming=streaming,
        )

        try:
            dataset = datasets.load_dataset(  # nosec B615
                self.dataset_path,
                self.config_name,
                split=split_name,
                cache_dir=str(self.cache_dir),
                streaming=streaming,
                **kwargs,
            )

            # Handle combined splits
            if split == DatasetSplit.ALL and not streaming:
                if hasattr(dataset, "keys"):
                    dataset = datasets.concatenate_datasets([dataset[s] for s in dataset.keys()])
                else:
                    raise ValueError(
                        "Cannot combine splits: dataset is not a dictionary-like object. "
                        "This may occur with streaming datasets or certain dataset formats."
                    )

            count = 0
            for idx, example in enumerate(dataset):
                if max_samples and count >= max_samples:
                    break

                try:
                    entry = self._convert_example(example, idx)
                    if entry:
                        yield entry
                        count += 1
                except Exception as e:
                    self.logger.warning("failed_to_convert_example", index=idx, error=str(e))
                    continue

            self.logger.info("dataset_loaded", count=count)

        except Exception as e:
            self.logger.error("failed_to_load_dataset", error=str(e))
            raise

    def _convert_example(self, example: dict[str, Any], idx: int) -> DatasetEntry | None:
        """Convert a dataset example to DatasetEntry."""
        # Apply preprocessing if provided
        if self.preprocess_fn:
            example = self.preprocess_fn(example)

        # Extract fields using column mapping
        query_col = self.column_mapping.get("query", "question")
        answer_col = self.column_mapping.get("answer", "answer")
        contexts_col = self.column_mapping.get("contexts", "context")
        docs_col = self.column_mapping.get("ground_truth_documents", "positive_passages")

        # Get query
        query = self._extract_field(example, query_col)
        if not query:
            return None

        # Get answer (handle different formats)
        answer = self._extract_answer(example, answer_col)

        # Get contexts (handle different formats)
        contexts = self._extract_contexts(example, contexts_col)

        # Get ground truth documents
        documents = self._extract_documents(example, docs_col)

        # Extract metadata
        metadata = {
            k: v
            for k, v in example.items()
            if k not in [query_col, answer_col, contexts_col, docs_col]
            and not isinstance(v, (list, dict))
            or k in ["id", "type"]
        }

        return DatasetEntry(
            id=self._generate_id(idx),
            query=query,
            answer=answer,
            contexts=contexts,
            ground_truth_documents=documents,
            metadata=metadata,
            dataset_name=self.name,
            language=self._dataset_info.language if self._dataset_info else None,
        )

    def _extract_field(self, example: dict, column: str) -> str | None:
        """Extract a string field from example."""
        value = example.get(column)
        if isinstance(value, str):
            return value
        elif isinstance(value, list) and value:
            if isinstance(value[0], str):
                return value[0]
        return None

    def _extract_answer(self, example: dict, column: str) -> str | None:
        """Extract answer handling various formats."""
        value = example.get(column)
        if isinstance(value, str):
            return value
        elif isinstance(value, list):
            if value and isinstance(value[0], str):
                return value[0]
            elif value and isinstance(value[0], dict):
                # Handle nested structures
                return str(value[0])
        elif isinstance(value, dict):
            # Some datasets have answer as dict with text key
            return value.get("text", [None])[0] if "text" in value else str(value)
        return None

    def _extract_contexts(self, example: dict, column: str) -> list[str]:
        """Extract contexts handling various formats."""
        value = example.get(column)
        if isinstance(value, str):
            return [value]
        elif isinstance(value, list):
            if value and isinstance(value[0], str):
                return value
            elif value and isinstance(value[0], dict):
                # Extract text from dict structures
                contexts = []
                for item in value:
                    if isinstance(item, dict):
                        text = item.get("text", item.get("passage_text", ""))
                        if text:
                            contexts.append(text)
                return contexts
        return []

    def _extract_documents(self, example: dict, column: str) -> list[str]:
        """Extract ground truth documents handling various formats."""
        value = example.get(column)
        if isinstance(value, str):
            return [value]
        elif isinstance(value, list):
            if value and isinstance(value[0], str):
                return value
            elif value and isinstance(value[0], dict):
                docs = []
                for item in value:
                    if isinstance(item, dict):
                        doc_id = item.get("docid", item.get("id", str(item)))
                        docs.append(doc_id)
                return docs
        return []
