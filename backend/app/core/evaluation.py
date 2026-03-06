"""
LLM Evaluation Framework

Implements systematic evaluation of LLM outputs for quality:
- Relevance: Does it answer the question?
- Coherence: Is it well-structured?
- Groundedness: Is it based on provided context?
- Accuracy: Does it match ground truth?
- Safety: Is it safe?
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any

import structlog
from backend.app.core.telemetry import get_tracer

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class EvaluationMetric(Enum):
    """Available evaluation metrics."""

    RELEVANCE = "relevance"
    COHERENCE = "coherence"
    GROUNDEDNESS = "groundedness"
    ACCURACY = "accuracy"
    SAFETY = "safety"
    HELPFULNESS = "helpfulness"


@dataclass
class EvaluationScore:
    """Score for a single metric."""

    metric: EvaluationMetric
    score: float  # 0.0 to 1.0
    reasoning: str
    threshold: float = 0.7

    @property
    def passed(self) -> bool:
        """Check if score meets threshold."""
        return self.score >= self.threshold


@dataclass
class EvaluationResult:
    """Complete evaluation result."""

    scores: list[EvaluationScore]
    overall_score: float
    passed: bool
    metadata: dict[str, Any]

    def get_score(self, metric: EvaluationMetric) -> float | None:
        """Get score for specific metric."""
        for s in self.scores:
            if s.metric == metric:
                return s.score
        return None


class LLMEvaluator:
    """
    Evaluate LLM responses for quality.

    Uses a combination of:
    1. Rule-based checks (fast)
    2. LLM-as-judge (comprehensive)
    3. Statistical metrics (reference-based)
    """
