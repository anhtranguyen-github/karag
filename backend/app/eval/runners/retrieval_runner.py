"""
Retrieval-focused evaluation runner.

Focuses specifically on evaluating the retrieval component of RAG systems
with comprehensive retrieval metrics.
"""

import time
from datetime import datetime
from typing import Any, Callable, Iterator, List

import structlog

from backend.app.eval.datasets.base import DatasetEntry
from backend.app.eval.metrics.retrieval import RetrievalMetrics
from backend.app.eval.runners.base import (
    BaseRunner,
    RunnerConfig,
    RunnerResult,
    RunnerStatus,
    SampleResult,
)

logger = structlog.get_logger(__name__)


class RetrievalRunner(BaseRunner):
    """
    Runner focused on evaluating retrieval quality.
    
    This runner is designed for retrieval-only evaluation, useful when:
    - Testing different retrieval strategies
    - Comparing embedding models
    - Evaluating reranking approaches
    - Benchmarking vector stores
    
    Example:
        runner = RetrievalRunner()
        result = await runner.run(
            dataset=loader.load(),
            retrieval_pipeline=my_retrieval_pipeline,
            config=RunnerConfig(k_values=[1, 5, 10, 20, 50]),
        )
    """
    
    def __init__(self):
        super().__init__("retrieval")
        self.retrieval_metrics = RetrievalMetrics()
    
    async def run(
        self,
        dataset: Iterator[DatasetEntry],
        rag_pipeline: Callable[[str], Any],
        config: RunnerConfig,
    ) -> RunnerResult:
        """
        Run retrieval-focused evaluation.
        
        Args:
            dataset: Iterator over dataset entries
            rag_pipeline: Async function that takes query and returns
                dict with "documents" key (list of retrieved doc IDs)
            config: Runner configuration
            
        Returns:
            RunnerResult with retrieval metrics
        """
        result = self._create_result("dataset", config, RunnerStatus.RUNNING)
        result.config.compute_generation_metrics = False
        
        sample_results: List[SampleResult] = []
        count = 0
        
        try:
            for entry in dataset:
                if config.max_samples and count >= config.max_samples:
                    break
                
                count += 1
                sample_result = await self._evaluate_retrieval(
                    entry, rag_pipeline, config
                )
                sample_results.append(sample_result)
                
                if sample_result.error:
                    result.failed_samples += 1
                else:
                    result.successful_samples += 1
            
            result.total_samples = count
            result.sample_results = sample_results
            result.aggregated_metrics = self._aggregate_metrics(sample_results)
            result.status = RunnerStatus.COMPLETED
            result.completed_at = datetime.utcnow()
            
        except Exception as e:
            self.logger.error("evaluation_failed", error=str(e))
            result.status = RunnerStatus.FAILED
            result.metadata["error"] = str(e)
        
        return result
    
    async def _evaluate_retrieval(
        self,
        entry: DatasetEntry,
        rag_pipeline: Callable,
        config: RunnerConfig,
    ) -> SampleResult:
        """Evaluate retrieval for a single sample."""
        start_time = time.time()
        
        sample_result = SampleResult(
            sample_id=entry.id,
            query=entry.query,
            ground_truth_answer=entry.answer,
        )
        
        try:
            # Run retrieval (expecting only documents, not full answer)
            rag_output = await rag_pipeline(entry.query)
            
            sample_result.retrieved_documents = rag_output.get("documents", [])
            
            # Compute retrieval metrics
            if entry.ground_truth_documents:
                retrieval_results = self.retrieval_metrics.compute_all(
                    retrieved_doc_ids=sample_result.retrieved_documents,
                    relevant_doc_ids=entry.ground_truth_documents,
                    k_values=config.k_values,
                )
                sample_result.retrieval_metrics = {
                    k: v.score for k, v in retrieval_results.items()
                }
            
            # Record latency
            sample_result.latency_ms = (time.time() - start_time) * 1000
            
        except Exception as e:
            self.logger.error(
                "retrieval_evaluation_failed",
                sample_id=entry.id,
                error=str(e),
            )
            sample_result.error = str(e)
        
        return sample_result
    
    def analyze_by_position(self, result: RunnerResult) -> dict:
        """
        Analyze retrieval performance by position in results.
        
        Useful for understanding where in the ranked list
        relevant documents appear.
        
        Args:
            result: RunnerResult from a run
            
        Returns:
            Analysis dictionary
        """
        positions = []
        
        for sr in result.sample_results:
            if not sr.retrieved_documents or not sr.ground_truth_answer:
                continue
            
            # Find position of first relevant document
            # This is simplified - would need ground truth doc IDs
            # to calculate accurately
            for i, doc in enumerate(sr.retrieved_documents):
                if doc in sr.metadata.get("ground_truth_doc_ids", []):
                    positions.append(i + 1)
                    break
        
        if not positions:
            return {"note": "No position data available"}
        
        return {
            "mean_position": sum(positions) / len(positions),
            "median_position": sorted(positions)[len(positions) // 2],
            "min_position": min(positions),
            "max_position": max(positions),
            "positions": positions[:20],  # First 20 for detail
        }
