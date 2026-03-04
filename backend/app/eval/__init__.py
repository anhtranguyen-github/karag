"""
KARAG Evaluation Framework

Comprehensive RAG evaluation framework supporting multiple datasets
and metrics for both English and Vietnamese languages.
"""

from backend.app.eval.datasets.base import BaseDatasetLoader, DatasetEntry, DatasetSplit
from backend.app.eval.datasets.registry import DatasetRegistry, dataset_registry
from backend.app.eval.metrics.retrieval import RetrievalMetrics
from backend.app.eval.metrics.generation import GenerationMetrics
from backend.app.eval.metrics.aggregator import MetricsAggregator, AggregateResult
from backend.app.eval.runners.base import BaseRunner, RunnerConfig, RunnerResult, SampleResult
from backend.app.eval.runners.standard_runner import StandardQARunner
from backend.app.eval.runners.retrieval_runner import RetrievalRunner
from backend.app.eval.runners.end_to_end_runner import EndToEndRunner
from backend.app.eval.runners.robustness_runner import RobustnessRunner
from backend.app.eval.datasets.definitions import register_all_datasets

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