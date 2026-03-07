"""
Metrics aggregator for RAG evaluation.

Aggregates and reports metrics from multiple evaluation runs,
providing statistical summaries and comparative analysis.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class AggregateResult:
    """Aggregated results from multiple evaluation runs."""

    metric_name: str
    mean: float
    std: float
    min: float
    max: float
    count: int
    percentiles: dict[str, float] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


class MetricsAggregator:
    """
    Aggregates and analyzes evaluation metrics across multiple runs.

    Provides:
    - Statistical summaries (mean, std, min, max, percentiles)
    - Comparison between runs
    - Trend analysis
    - Report generation

    Example:
        aggregator = MetricsAggregator()

        # Add results from multiple runs
        aggregator.add_run("run_1", results_1)
        aggregator.add_run("run_2", results_2)

        # Get aggregated statistics
        stats = aggregator.aggregate()

        # Generate report
        report = aggregator.generate_report()
    """

    def __init__(self):
        self.runs: dict[str, dict[str, Any]] = {}
        self.logger = logger

    def add_run(
        self,
        run_id: str,
        results: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """
        Add results from a single evaluation run.

        Args:
            run_id: Unique identifier for the run
            results: Dictionary of metric results
            metadata: Optional metadata about the run
        """
        self.runs[run_id] = {
            "results": results,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow(),
        }
        self.logger.info("run_added", run_id=run_id)

    def aggregate(
        self,
        metric_filter: list[str] | None = None,
    ) -> dict[str, AggregateResult]:
        """
        Aggregate metrics across all runs.

        Args:
            metric_filter: Optional list of metrics to include

        Returns:
            Dictionary mapping metric names to AggregateResults
        """
        if not self.runs:
            return {}

        # Collect all scores for each metric
        metric_scores: dict[str, list[float]] = {}

        for _run_id, run_data in self.runs.items():
            results = run_data["results"]

            for metric_name, value in results.items():
                if metric_filter and metric_name not in metric_filter:
                    continue

                # Extract score from different result formats
                score = self._extract_score(value)
                if score is not None:
                    if metric_name not in metric_scores:
                        metric_scores[metric_name] = []
                    metric_scores[metric_name].append(score)

        # Compute statistics for each metric
        aggregated = {}
        for metric_name, scores in metric_scores.items():
            if len(scores) < 1:
                continue

            stats = self._compute_statistics(scores)
            aggregated[metric_name] = AggregateResult(
                metric_name=metric_name,
                **stats,
            )

        return aggregated

    def compare_runs(
        self,
        run_id_1: str,
        run_id_2: str,
    ) -> dict[str, dict[str, float]]:
        """
        Compare two evaluation runs.

        Args:
            run_id_1: First run identifier
            run_id_2: Second run identifier

        Returns:
            Dictionary with comparison metrics
        """
        if run_id_1 not in self.runs or run_id_2 not in self.runs:
            raise ValueError("Run ID not found")

        results_1 = self.runs[run_id_1]["results"]
        results_2 = self.runs[run_id_2]["results"]

        comparison = {}

        # Find common metrics
        common_metrics = set(results_1.keys()) & set(results_2.keys())

        for metric in common_metrics:
            score_1 = self._extract_score(results_1[metric])
            score_2 = self._extract_score(results_2[metric])

            if score_1 is not None and score_2 is not None:
                diff = score_2 - score_1
                pct_change = (diff / score_1 * 100) if score_1 != 0 else 0

                comparison[metric] = {
                    "run_1_score": score_1,
                    "run_2_score": score_2,
                    "absolute_diff": diff,
                    "percent_change": pct_change,
                    "improved": diff > 0,
                }

        return comparison

    def get_improvements(
        self,
        baseline_run: str,
        comparison_run: str,
        threshold: float = 0.01,
    ) -> dict[str, dict[str, float]]:
        """
        Get metrics that improved in comparison run vs baseline.

        Args:
            baseline_run: Baseline run identifier
            comparison_run: Comparison run identifier
            threshold: Minimum improvement to report (default 0.01)

        Returns:
            Dictionary of improved metrics
        """
        comparison = self.compare_runs(baseline_run, comparison_run)

        return {
            metric: data
            for metric, data in comparison.items()
            if data["improved"] and abs(data["absolute_diff"]) >= threshold
        }

    def get_regressions(
        self,
        baseline_run: str,
        comparison_run: str,
        threshold: float = 0.01,
    ) -> dict[str, dict[str, float]]:
        """
        Get metrics that regressed in comparison run vs baseline.

        Args:
            baseline_run: Baseline run identifier
            comparison_run: Comparison run identifier
            threshold: Minimum regression to report (default 0.01)

        Returns:
            Dictionary of regressed metrics
        """
        comparison = self.compare_runs(baseline_run, comparison_run)

        return {
            metric: data
            for metric, data in comparison.items()
            if not data["improved"] and abs(data["absolute_diff"]) >= threshold
        }

    def generate_report(
        self,
        format: str = "markdown",
        include_details: bool = True,
    ) -> str:
        """
        Generate a human-readable evaluation report.

        Args:
            format: Report format ("markdown", "json", "html")
            include_details: Whether to include detailed statistics

        Returns:
            Report string
        """
        if format == "markdown":
            return self._generate_markdown_report(include_details)
        elif format == "json":
            import json

            aggregated = self.aggregate()
            return json.dumps(
                {
                    k: {
                        "mean": v.mean,
                        "std": v.std,
                        "min": v.min,
                        "max": v.max,
                        "count": v.count,
                    }
                    for k, v in aggregated.items()
                },
                indent=2,
            )
        else:
            raise ValueError(f"Unsupported format: {format}")

    def _generate_markdown_report(self, include_details: bool) -> str:
        """Generate markdown format report."""
        aggregated = self.aggregate()

        lines = [
            "# RAG Evaluation Report",
            "",
            f"**Generated:** {datetime.utcnow().isoformat()}",
            f"**Total Runs:** {len(self.runs)}",
            "",
            "## Summary Statistics",
            "",
            "| Metric | Mean | Std | Min | Max | Count |",
            "|--------|------|-----|-----|-----|-------|",
        ]

        for metric_name, result in sorted(aggregated.items()):
            lines.append(
                f"| {metric_name} | "
                f"{result.mean:.4f} | "
                f"{result.std:.4f} | "
                f"{result.min:.4f} | "
                f"{result.max:.4f} | "
                f"{result.count} |"
            )

        if include_details and len(self.runs) > 1:
            lines.extend(
                [
                    "",
                    "## Individual Runs",
                    "",
                ]
            )

            for run_id, run_data in self.runs.items():
                lines.append(f"### {run_id}")
                lines.append(f"- **Timestamp:** {run_data['timestamp']}")
                if run_data["metadata"]:
                    for key, value in run_data["metadata"].items():
                        lines.append(f"- **{key}:** {value}")
                lines.append("")

        return "\n".join(lines)

    def _extract_score(self, value: Any) -> float | None:
        """Extract numeric score from various result formats."""
        if isinstance(value, (int, float)):
            return float(value)
        elif isinstance(value, dict):
            # Try common score keys
            for key in ["score", "value", "mean", "f1", "precision", "recall"]:
                if key in value and isinstance(value[key], (int, float)):
                    return float(value[key])
        return None

    def _compute_statistics(self, scores: list[float]) -> dict[str, Any]:
        """Compute statistical summary of scores."""
        n = len(scores)
        mean = sum(scores) / n
        variance = sum((x - mean) ** 2 for x in scores) / n
        std = variance**0.5

        # Calculate percentiles
        sorted_scores = sorted(scores)
        percentiles = {
            "p25": self._percentile(sorted_scores, 25),
            "p50": self._percentile(sorted_scores, 50),
            "p75": self._percentile(sorted_scores, 75),
            "p95": self._percentile(sorted_scores, 95),
        }

        return {
            "mean": mean,
            "std": std,
            "min": min(scores),
            "max": max(scores),
            "count": n,
            "percentiles": percentiles,
        }

    def _percentile(self, sorted_data: list[float], p: float) -> float:
        """Calculate percentile from sorted data."""
        k = (len(sorted_data) - 1) * p / 100
        f = int(k)
        c = f + 1 if f + 1 < len(sorted_data) else f

        if f == c:
            return sorted_data[f]

        return sorted_data[f] * (c - k) + sorted_data[c] * (k - f)

    def export_to_dict(self) -> dict[str, Any]:
        """Export all data to a dictionary."""
        return {
            "runs": {
                run_id: {
                    "results": run_data["results"],
                    "metadata": run_data["metadata"],
                    "timestamp": run_data["timestamp"].isoformat(),
                }
                for run_id, run_data in self.runs.items()
            },
            "aggregated": {
                k: {
                    "mean": v.mean,
                    "std": v.std,
                    "min": v.min,
                    "max": v.max,
                    "count": v.count,
                    "percentiles": v.percentiles,
                }
                for k, v in self.aggregate().items()
            },
        }
