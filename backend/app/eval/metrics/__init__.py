"""
RAG evaluation metrics.

Comprehensive metrics for evaluating retrieval and generation quality
in RAG systems. Includes both traditional IR metrics and modern RAGAS-style metrics.
"""

from backend.app.eval.metrics.aggregator import AggregateResult, MetricsAggregator
from backend.app.eval.metrics.generation import GenerationMetrics
from backend.app.eval.metrics.retrieval import RetrievalMetrics

__all__ = [
    "RetrievalMetrics",
    "GenerationMetrics",
    "MetricsAggregator",
    "AggregateResult",
]
