"""
Robustness evaluation runner.

Tests RAG system robustness against:
- Noisy queries
- Counterfactual questions
- Adversarial inputs
- Out-of-domain queries
"""

import random
import time
from datetime import datetime
from typing import Any, Callable, Dict, Iterator, List, Optional

import structlog

from backend.app.eval.datasets.base import DatasetEntry
from backend.app.eval.metrics.generation import GenerationMetrics
from backend.app.eval.runners.base import (
    BaseRunner,
    RunnerConfig,
    RunnerResult,
    RunnerStatus,
    SampleResult,
)

logger = structlog.get_logger(__name__)


class RobustnessRunner(BaseRunner):
    """
    Runner for evaluating RAG system robustness.

    Tests how well the RAG system handles:
    - Typos and spelling errors
    - Noisy/irrelevant context
    - Counterfactual questions
    - Ambiguous queries
    - Out-of-domain queries

    Example:
        runner = RobustnessRunner()
        result = await runner.run(
            dataset=loader.load(),
            rag_pipeline=my_rag_pipeline,
            config=RunnerConfig(max_samples=100),
            noise_level=0.1,
        )
    """

    def __init__(self):
        super().__init__("robustness")
        self.generation_metrics = GenerationMetrics()

    async def run(
        self,
        dataset: Iterator[DatasetEntry],
        rag_pipeline: Callable[[str], Any],
        config: RunnerConfig,
        noise_level: float = 0.1,
        test_types: Optional[List[str]] = None,
    ) -> RunnerResult:
        """
        Run robustness evaluation.

        Args:
            dataset: Iterator over dataset entries
            rag_pipeline: Async function for RAG pipeline
            config: Runner configuration
            noise_level: Level of noise to introduce (0.0 to 1.0)
            test_types: List of test types to run
                Options: ["typo", "noise", "ambiguous", "counterfactual", "ood"]
                Default: all types

        Returns:
            RunnerResult with robustness evaluation results
        """
        result = self._create_result("dataset", config, RunnerStatus.RUNNING)

        if test_types is None:
            test_types = ["typo", "noise", "ambiguous", "counterfactual"]

        sample_results: List[SampleResult] = []
        robustness_tests: List[Dict] = []
        count = 0

        try:
            for entry in dataset:
                if config.max_samples and count >= config.max_samples:
                    break

                count += 1

                # Run baseline (clean query)
                baseline_result = await self._evaluate_baseline(
                    entry, rag_pipeline, config
                )

                # Run robustness tests
                test_results = {}
                for test_type in test_types:
                    test_result = await self._run_robustness_test(
                        entry, rag_pipeline, config, test_type, noise_level
                    )
                    test_results[test_type] = test_result

                sample_results.append(baseline_result)
                robustness_tests.append(
                    {
                        "sample_id": entry.id,
                        "baseline": baseline_result.generation_metrics,
                        "tests": test_results,
                    }
                )

                if baseline_result.error:
                    result.failed_samples += 1
                else:
                    result.successful_samples += 1

            result.total_samples = count
            result.sample_results = sample_results
            result.metadata["robustness_tests"] = robustness_tests
            result.aggregated_metrics = self._aggregate_robustness(robustness_tests)
            result.status = RunnerStatus.COMPLETED
            result.completed_at = datetime.utcnow()

        except Exception as e:
            self.logger.error("evaluation_failed", error=str(e))
            result.status = RunnerStatus.FAILED
            result.metadata["error"] = str(e)

        return result

    async def _evaluate_baseline(
        self,
        entry: DatasetEntry,
        rag_pipeline: Callable,
        config: RunnerConfig,
    ) -> SampleResult:
        """Evaluate baseline (clean query)."""
        sample_result = SampleResult(
            sample_id=f"{entry.id}_baseline",
            query=entry.query,
            ground_truth_answer=entry.answer,
        )

        try:
            rag_output = await rag_pipeline(entry.query)
            sample_result.predicted_answer = rag_output.get("answer")
            contexts = rag_output.get("contexts", [])

            if sample_result.predicted_answer:
                generation_results = self.generation_metrics.compute_all(
                    query=entry.query,
                    answer=sample_result.predicted_answer,
                    contexts=contexts,
                    reference_answer=entry.answer,
                )
                sample_result.generation_metrics = {
                    k: v.score for k, v in generation_results.items()
                }
        except Exception as e:
            sample_result.error = str(e)

        return sample_result

    async def _run_robustness_test(
        self,
        entry: DatasetEntry,
        rag_pipeline: Callable,
        config: RunnerConfig,
        test_type: str,
        noise_level: float,
    ) -> Dict:
        """Run a single robustness test."""
        # Generate perturbed query
        if test_type == "typo":
            perturbed_query = self._add_typos(entry.query, noise_level)
        elif test_type == "noise":
            perturbed_query = self._add_noise(entry.query, noise_level)
        elif test_type == "ambiguous":
            perturbed_query = self._make_ambiguous(entry.query)
        elif test_type == "counterfactual":
            perturbed_query = self._make_counterfactual(entry.query)
        else:
            perturbed_query = entry.query

        test_result = {
            "test_type": test_type,
            "original_query": entry.query,
            "perturbed_query": perturbed_query,
        }

        try:
            start_time = time.time()
            rag_output = await rag_pipeline(perturbed_query)
            latency_ms = (time.time() - start_time) * 1000

            predicted_answer = rag_output.get("answer")
            contexts = rag_output.get("contexts", [])

            test_result["predicted_answer"] = predicted_answer
            test_result["latency_ms"] = latency_ms

            # Compute metrics
            if predicted_answer:
                generation_results = self.generation_metrics.compute_all(
                    query=perturbed_query,
                    answer=predicted_answer,
                    contexts=contexts,
                    reference_answer=entry.answer,
                )
                test_result["metrics"] = {
                    k: v.score for k, v in generation_results.items()
                }

        except Exception as e:
            test_result["error"] = str(e)

        return test_result

    def _add_typos(self, text: str, level: float) -> str:
        """Add random typos to text."""
        chars = list(text)
        num_typos = int(len(chars) * level)

        for _ in range(num_typos):
            if len(chars) < 2:
                break
            idx = random.randint(0, len(chars) - 2)
            # Swap adjacent characters
            chars[idx], chars[idx + 1] = chars[idx + 1], chars[idx]

        return "".join(chars)

    def _add_noise(self, text: str, level: float) -> str:
        """Add random noise words to text."""
        noise_words = ["the", "a", "is", "are", "and", "or", "but", "in", "on"]
        words = text.split()
        num_noise = int(len(words) * level)

        for _ in range(num_noise):
            idx = random.randint(0, len(words))
            words.insert(idx, random.choice(noise_words))

        return " ".join(words)

    def _make_ambiguous(self, text: str) -> str:
        """Make query more ambiguous."""
        # Remove specific terms
        ambiguous = text.replace("specific", "certain")
        ambiguous = ambiguous.replace("exact", "some")
        return ambiguous

    def _make_counterfactual(self, text: str) -> str:
        """Make query counterfactual."""
        # Add "What if" or "Suppose" prefix
        prefixes = ["What if", "Suppose", "Imagine if", "Assume"]
        return f"{random.choice(prefixes)} {text}"

    def _aggregate_robustness(
        self,
        robustness_tests: List[Dict],
    ) -> Dict[str, Dict[str, float]]:
        """Aggregate robustness test results."""
        # Group by test type
        by_type: Dict[str, List[Dict]] = {}

        for test in robustness_tests:
            for test_type, result in test["tests"].items():
                if test_type not in by_type:
                    by_type[test_type] = []
                by_type[test_type].append(result)

        # Compute statistics for each test type
        aggregated = {}
        for test_type, results in by_type.items():
            # Collect metric scores
            metric_scores: Dict[str, List[float]] = {}

            for result in results:
                if "metrics" in result:
                    for metric, score in result["metrics"].items():
                        if metric not in metric_scores:
                            metric_scores[metric] = []
                        metric_scores[metric].append(score)

            # Compute stats
            aggregated[test_type] = {}
            for metric, scores in metric_scores.items():
                if scores:
                    aggregated[test_type][metric] = {
                        "mean": sum(scores) / len(scores),
                        "min": min(scores),
                        "max": max(scores),
                    }

        # Compute overall robustness score
        all_scores = []
        for test_type_data in aggregated.values():
            for metric_data in test_type_data.values():
                if "mean" in metric_data:
                    all_scores.append(metric_data["mean"])

        if all_scores:
            aggregated["overall_robustness"] = {
                "mean": sum(all_scores) / len(all_scores),
            }

        return aggregated
