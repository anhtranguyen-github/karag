"""
Standard QA evaluation runner.

Evaluates RAG systems on standard question-answering tasks
with both retrieval and generation metrics.
"""

import time
from datetime import datetime
from typing import Any, Callable, Dict, Iterator, List

import structlog

from backend.app.eval.datasets.base import DatasetEntry
from backend.app.eval.metrics.retrieval import RetrievalMetrics
from backend.app.eval.metrics.generation import GenerationMetrics
from backend.app.eval.runners.base import (
    BaseRunner,
    RunnerConfig,
    RunnerResult,
    RunnerStatus,
    SampleResult,
)

logger = structlog.get_logger(__name__)


class StandardQARunner(BaseRunner):
    """
    Standard QA evaluation runner for RAG systems.
    
    This runner evaluates both the retrieval and generation components
    of a RAG system on standard QA datasets.
    
    Metrics computed:
    - Retrieval: Recall@k, Precision@k, nDCG@k, MRR, Hit Rate
    - Generation: Faithfulness, Answer Relevancy, F1, Exact Match
    
    Example:
        runner = StandardQARunner()
        result = await runner.run(
            dataset=loader.load(),
            rag_pipeline=my_rag_pipeline,
            config=RunnerConfig(max_samples=100),
        )
    """
    
    def __init__(self):
        super().__init__("standard_qa")
        self.retrieval_metrics = RetrievalMetrics()
        self.generation_metrics = GenerationMetrics()
    
    async def run(
        self,
        dataset: Iterator[DatasetEntry],
        rag_pipeline: Callable[[str], Any],
        config: RunnerConfig,
    ) -> RunnerResult:
        """
        Run standard QA evaluation.
        
        Args:
            dataset: Iterator over dataset entries
            rag_pipeline: Async function that takes query and returns
                dict with "answer" and "documents" keys
            config: Runner configuration
            
        Returns:
            RunnerResult with evaluation results
        """
        result = self._create_result("dataset", config, RunnerStatus.RUNNING)
        
        sample_results: List[SampleResult] = []
        count = 0
        
        try:
            for entry in dataset:
                if config.max_samples and count >= config.max_samples:
                    break
                
                count += 1
                sample_result = await self._evaluate_sample(
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
    
    async def _evaluate_sample(
        self,
        entry: DatasetEntry,
        rag_pipeline: Callable,
        config: RunnerConfig,
    ) -> SampleResult:
        """Evaluate a single sample."""
        start_time = time.time()
        
        sample_result = SampleResult(
            sample_id=entry.id,
            query=entry.query,
            ground_truth_answer=entry.answer,
        )
        
        try:
            # Run RAG pipeline
            rag_output = await rag_pipeline(entry.query)
            
            sample_result.predicted_answer = rag_output.get("answer")
            sample_result.retrieved_documents = rag_output.get("documents", [])
            contexts = rag_output.get("contexts", [])
            
            # Compute retrieval metrics
            if config.compute_retrieval_metrics and entry.ground_truth_documents:
                retrieval_results = self.retrieval_metrics.compute_all(
                    retrieved_doc_ids=sample_result.retrieved_documents,
                    relevant_doc_ids=entry.ground_truth_documents,
                    k_values=config.k_values,
                )
                sample_result.retrieval_metrics = {
                    k: v.score for k, v in retrieval_results.items()
                }
            
            # Compute generation metrics
            if config.compute_generation_metrics and sample_result.predicted_answer:
                generation_results = self.generation_metrics.compute_all(
                    query=entry.query,
                    answer=sample_result.predicted_answer,
                    contexts=contexts if contexts else entry.contexts,
                    reference_answer=entry.answer,
                )
                sample_result.generation_metrics = {
                    k: v.score for k, v in generation_results.items()
                }
            
            # Record latency
            sample_result.latency_ms = (time.time() - start_time) * 1000
            
        except Exception as e:
            self.logger.error(
                "sample_evaluation_failed",
                sample_id=entry.id,
                error=str(e),
            )
            sample_result.error = str(e)
        
        return sample_result