"""
End-to-end RAG pipeline evaluation runner.

Evaluates the complete RAG pipeline from query to answer,
including all intermediate steps.
"""

import time
from collections.abc import Callable, Iterator
from datetime import datetime
from typing import Any

import structlog

from src.backend.app.eval.datasets.base import DatasetEntry
from src.backend.app.eval.metrics.generation import GenerationMetrics
from src.backend.app.eval.metrics.retrieval import RetrievalMetrics
from src.backend.app.eval.runners.base import (
    BaseRunner,
    RunnerConfig,
    RunnerResult,
    RunnerStatus,
    SampleResult,
)

logger = structlog.get_logger(__name__)


class EndToEndRunner(BaseRunner):
    """
    Comprehensive end-to-end RAG evaluation runner.

    This runner evaluates the entire RAG pipeline including:
    - Query understanding/preprocessing
    - Document retrieval
    - Context assembly
    - Answer generation
    - Post-processing

    Provides detailed intermediate results for debugging.

    Example:
        runner = EndToEndRunner()
        result = await runner.run(
            dataset=loader.load(),
            rag_pipeline=my_rag_pipeline,
            config=RunnerConfig(max_samples=100),
        )
    """

    def __init__(self):
        super().__init__("end_to_end")
        self.retrieval_metrics = RetrievalMetrics()
        self.generation_metrics = GenerationMetrics()

    async def run(
        self,
        dataset: Iterator[DatasetEntry],
        rag_pipeline: Callable[[str], Any],
        config: RunnerConfig,
    ) -> RunnerResult:
        """
        Run end-to-end evaluation.

        Args:
            dataset: Iterator over dataset entries
            rag_pipeline: Async function that takes query and returns
                comprehensive output dict with detailed intermediate results
            config: Runner configuration

        Returns:
            RunnerResult with comprehensive evaluation results
        """
        result = self._create_result("dataset", config, RunnerStatus.RUNNING)

        sample_results: list[SampleResult] = []
        intermediate_results: list[dict] = []
        count = 0

        try:
            for entry in dataset:
                if config.max_samples and count >= config.max_samples:
                    break

                count += 1
                sample_result, intermediate = await self._evaluate_end_to_end(entry, rag_pipeline, config)
                sample_results.append(sample_result)
                # Only store intermediate results if enabled and within limit
                if config.save_intermediate and len(intermediate_results) < config.max_intermediate_samples:
                    intermediate_results.append(intermediate)

                if sample_result.error:
                    result.failed_samples += 1
                else:
                    result.successful_samples += 1

            result.total_samples = count
            result.sample_results = sample_results
            result.aggregated_metrics = self._aggregate_metrics(sample_results)
            result.metadata["intermediate_results"] = intermediate_results
            result.status = RunnerStatus.COMPLETED
            result.completed_at = datetime.utcnow()

        except Exception as e:
            self.logger.error("evaluation_failed", error=str(e))
            result.status = RunnerStatus.FAILED
            result.metadata["error"] = str(e)

        return result

    async def _evaluate_end_to_end(
        self,
        entry: DatasetEntry,
        rag_pipeline: Callable,
        config: RunnerConfig,
    ) -> tuple:
        """Evaluate end-to-end pipeline for a single sample."""
        start_time = time.time()
        intermediate = {"timings": {}, "steps": []}

        sample_result = SampleResult(
            sample_id=entry.id,
            query=entry.query,
            ground_truth_answer=entry.answer,
        )

        try:
            # Step 1: Query preprocessing (if exposed by pipeline)
            step_start = time.time()
            intermediate["steps"].append({"name": "query_preprocessing", "status": "started"})

            # Run full pipeline
            rag_output = await rag_pipeline(entry.query)

            intermediate["timings"]["query_preprocessing_ms"] = (time.time() - step_start) * 1000
            intermediate["steps"][0]["status"] = "completed"

            # Step 2: Document retrieval
            step_start = time.time()
            intermediate["steps"].append({"name": "document_retrieval", "status": "started"})

            sample_result.retrieved_documents = rag_output.get("documents", [])
            contexts = rag_output.get("contexts", [])

            intermediate["timings"]["retrieval_ms"] = (time.time() - step_start) * 1000
            intermediate["steps"][1]["status"] = "completed"
            intermediate["retrieval_count"] = len(sample_result.retrieved_documents)

            # Compute retrieval metrics
            if config.compute_retrieval_metrics and entry.ground_truth_documents:
                retrieval_results = self.retrieval_metrics.compute_all(
                    retrieved_doc_ids=sample_result.retrieved_documents,
                    relevant_doc_ids=entry.ground_truth_documents,
                    k_values=config.k_values,
                )
                sample_result.retrieval_metrics = {k: v.score for k, v in retrieval_results.items()}

            # Step 3: Answer generation
            step_start = time.time()
            intermediate["steps"].append({"name": "answer_generation", "status": "started"})

            sample_result.predicted_answer = rag_output.get("answer")

            intermediate["timings"]["generation_ms"] = (time.time() - step_start) * 1000
            intermediate["steps"][2]["status"] = "completed"
            intermediate["answer_length"] = len(sample_result.predicted_answer) if sample_result.predicted_answer else 0

            # Compute generation metrics
            if config.compute_generation_metrics and sample_result.predicted_answer:
                generation_results = self.generation_metrics.compute_all(
                    query=entry.query,
                    answer=sample_result.predicted_answer,
                    contexts=contexts if contexts else entry.contexts,
                    reference_answer=entry.answer,
                )
                sample_result.generation_metrics = {k: v.score for k, v in generation_results.items()}

            # Record total latency
            sample_result.latency_ms = (time.time() - start_time) * 1000
            intermediate["timings"]["total_ms"] = sample_result.latency_ms

            # Store additional metadata
            sample_result.metadata.update(
                {
                    "query_length": len(entry.query),
                    "answer_length": len(sample_result.predicted_answer) if sample_result.predicted_answer else 0,
                    "context_count": len(contexts),
                    "retrieved_count": len(sample_result.retrieved_documents),
                }
            )

        except Exception as e:
            self.logger.error(
                "end_to_end_evaluation_failed",
                sample_id=entry.id,
                error=str(e),
            )
            sample_result.error = str(e)
            intermediate["error"] = str(e)
            intermediate["steps"][-1]["status"] = "failed"

        return sample_result, intermediate

    def analyze_pipeline_bottlenecks(self, result: RunnerResult) -> dict:
        """
        Analyze pipeline performance to identify bottlenecks.

        Args:
            result: RunnerResult from a run

        Returns:
            Analysis of pipeline bottlenecks
        """
        if "intermediate_results" not in result.metadata:
            return {"note": "No intermediate timing data available"}

        timings = {
            "query_preprocessing": [],
            "retrieval": [],
            "generation": [],
        }

        for intermediate in result.metadata["intermediate_results"]:
            if "timings" in intermediate:
                t = intermediate["timings"]
                if "query_preprocessing_ms" in t:
                    timings["query_preprocessing"].append(t["query_preprocessing_ms"])
                if "retrieval_ms" in t:
                    timings["retrieval"].append(t["retrieval_ms"])
                if "generation_ms" in t:
                    timings["generation"].append(t["generation_ms"])

        analysis = {}
        for stage, times in timings.items():
            if times:
                analysis[stage] = {
                    "mean_ms": sum(times) / len(times),
                    "max_ms": max(times),
                    "total_ms": sum(times),
                    "percentage": None,  # Will calculate below
                }

        # Calculate percentages
        total_time = sum(a["total_ms"] for a in analysis.values())
        for stage in analysis:
            analysis[stage]["percentage"] = analysis[stage]["total_ms"] / total_time * 100 if total_time > 0 else 0

        # Identify bottleneck
        if analysis:
            bottleneck = max(analysis.items(), key=lambda x: x[1]["percentage"])
            analysis["bottleneck"] = {
                "stage": bottleneck[0],
                "percentage": bottleneck[1]["percentage"],
            }

        return analysis
