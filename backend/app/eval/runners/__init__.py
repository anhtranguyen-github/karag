"""
Evaluation runners for executing RAG benchmarks.

Provides different runner implementations for various evaluation scenarios:
- Standard QA evaluation
- Retrieval-focused evaluation
- End-to-end RAG pipeline evaluation
- Robustness testing
"""

from backend.app.eval.runners.base import BaseRunner, RunnerConfig, RunnerResult
from backend.app.eval.runners.end_to_end_runner import EndToEndRunner
from backend.app.eval.runners.retrieval_runner import RetrievalRunner
from backend.app.eval.runners.robustness_runner import RobustnessRunner
from backend.app.eval.runners.standard_runner import StandardQARunner

__all__ = [
    "BaseRunner",
    "RunnerConfig",
    "RunnerResult",
    "StandardQARunner",
    "RetrievalRunner",
    "EndToEndRunner",
    "RobustnessRunner",
]
