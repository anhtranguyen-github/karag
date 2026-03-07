"""
KARAG Evaluation Framework

Comprehensive RAG evaluation framework supporting multiple datasets
and metrics for both English and Vietnamese languages.
"""

from src.backend.app.eval.datasets.base import BaseDatasetLoader, DatasetEntry, DatasetSplit
from src.backend.app.eval.datasets.definitions import register_all_datasets
from src.backend.app.eval.datasets.registry import DatasetRegistry, dataset_registry
from src.backend.app.eval.metrics.aggregator import AggregateResult, MetricsAggregator
from src.backend.app.eval.metrics.generation import GenerationMetrics
from src.backend.app.eval.metrics.retrieval import RetrievalMetrics
from src.backend.app.eval.runners.base import (
    BaseRunner,
    RunnerConfig,
    RunnerResult,
    SampleResult,
)
from src.backend.app.eval.runners.end_to_end_runner import EndToEndRunner
from src.backend.app.eval.runners.retrieval_runner import RetrievalRunner
from src.backend.app.eval.runners.robustness_runner import RobustnessRunner
from src.backend.app.eval.runners.standard_runner import StandardQARunner

__all__ = [
    "register_all_datasets",
    "BaseDatasetLoader",
    "DatasetEntry",
    "DatasetSplit",
    "DatasetRegistry",
    "dataset_registry",
    "RetrievalMetrics",
    "GenerationMetrics",
    "MetricsAggregator",
    "AggregateResult",
    "BaseRunner",
    "RunnerConfig",
    "RunnerResult",
    "SampleResult",
    "StandardQARunner",
    "RetrievalRunner",
    "EndToEndRunner",
    "RobustnessRunner",
]
