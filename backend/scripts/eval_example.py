#!/usr/bin/env python3
"""
Example usage of the KARAG RAG Evaluation Framework.

This script demonstrates how to use the evaluation framework
for various evaluation scenarios.
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app.eval import (
    StandardQARunner,
    EndToEndRunner,
    RetrievalRunner,
    RobustnessRunner,
    RunnerConfig,
    register_all_datasets,
)
from backend.app.eval.datasets.huggingface_loader import HuggingFaceDatasetLoader
from backend.app.eval.datasets.base import DatasetInfo, DatasetSplit
from backend.app.eval.metrics import (
    RetrievalMetrics,
    GenerationMetrics,
    MetricsAggregator,
)

# Register datasets explicitly (removed from import-time side effects)
register_all_datasets()


# Example RAG pipeline (mock implementation)
async def mock_rag_pipeline(query: str) -> dict:
    """
    Mock RAG pipeline for demonstration.

    In a real scenario, this would:
    1. Embed the query
    2. Retrieve documents from vector store
    3. Generate answer using LLM
    """
    # Simulate retrieval
    retrieved_docs = ["doc_001", "doc_042", "doc_123", "doc_007", "doc_999"]
    contexts = [
        "This is the first retrieved context...",
        "This is the second retrieved context...",
        "This is the third retrieved context...",
    ]

    # Simulate generation
    answer = f"Based on the retrieved context, the answer to '{query[:30]}...' is..."

    return {
        "answer": answer,
        "documents": retrieved_docs,
        "contexts": contexts,
    }


async def example_1_basic_evaluation():
    """Example 1: Basic evaluation with StandardQARunner."""
    print("\n" + "=" * 60)
    print("Example 1: Basic Evaluation with StandardQARunner")
    print("=" * 60)

    # Create a simple dataset loader
    loader = HuggingFaceDatasetLoader(
        name="squad_v2_sample",
        dataset_path="rajpurkar/squad_v2",
        column_mapping={
            "query": "question",
            "answer": "answers.text",
            "contexts": "context",
        },
        dataset_info=DatasetInfo(
            name="squad_v2_sample",
            description="SQuAD 2.0 sample",
            language="en",
            task_type="qa",
        ),
    )

    # Configure runner
    config = RunnerConfig(
        max_samples=10,
        k_values=[1, 5, 10],
        compute_retrieval_metrics=True,
        compute_generation_metrics=True,
    )

    # Create and run
    runner = StandardQARunner()

    print("Running evaluation...")
    result = await runner.run(
        dataset=loader.load(split=DatasetSplit.VALIDATION, max_samples=10),
        rag_pipeline=mock_rag_pipeline,
        config=config,
    )

    # Print results
    print("\nResults:")
    print(f"  Status: {result.status.value}")
    print(f"  Total Samples: {result.total_samples}")
    print(f"  Successful: {result.successful_samples}")
    print(f"  Failed: {result.failed_samples}")
    print(f"  Success Rate: {result.success_rate:.2%}")

    if result.aggregated_metrics:
        print("\n  Metrics:")
        for category, metrics in result.aggregated_metrics.items():
            print(f"    {category}:")
            for metric, values in metrics.items():
                if isinstance(values, dict) and "mean" in values:
                    print(f"      {metric}: {values['mean']:.4f}")


async def example_2_retrieval_only():
    """Example 2: Retrieval-only evaluation."""
    print("\n" + "=" * 60)
    print("Example 2: Retrieval-Only Evaluation")
    print("=" * 60)

    runner = RetrievalRunner()
    config = RunnerConfig(
        max_samples=5,
        k_values=[1, 5, 10, 20],
        compute_retrieval_metrics=True,
        compute_generation_metrics=False,
    )

    # Create loader
    loader = HuggingFaceDatasetLoader(
        name="ms_marco_sample",
        dataset_path="microsoft/ms_marco",
        config_name="v1.1",
        column_mapping={
            "query": "query",
            "answer": "answers",
            "contexts": "passages",
        },
    )

    print("Running retrieval evaluation...")
    result = await runner.run(
        dataset=loader.load(split=DatasetSplit.VALIDATION, max_samples=5),
        rag_pipeline=mock_rag_pipeline,
        config=config,
    )

    print("\nResults:")
    print(f"  Success Rate: {result.success_rate:.2%}")

    if result.aggregated_metrics:
        retrieval_metrics = result.aggregated_metrics.get("retrieval", {})
        print("\n  Retrieval Metrics:")
        for metric, values in retrieval_metrics.items():
            if isinstance(values, dict) and "mean" in values:
                print(f"    {metric}: {values['mean']:.4f}")


async def example_3_end_to_end():
    """Example 3: End-to-end evaluation with intermediate results."""
    print("\n" + "=" * 60)
    print("Example 3: End-to-End Evaluation")
    print("=" * 60)

    runner = EndToEndRunner()
    config = RunnerConfig(
        max_samples=5,
        k_values=[5, 10],
        save_intermediate=True,
    )

    loader = HuggingFaceDatasetLoader(
        name="hotpot_qa_sample",
        dataset_path="hotpot_qa",
        config_name="distractor",
        column_mapping={
            "query": "question",
            "answer": "answer",
            "contexts": "context",
        },
    )

    print("Running end-to-end evaluation...")
    result = await runner.run(
        dataset=loader.load(split=DatasetSplit.VALIDATION, max_samples=5),
        rag_pipeline=mock_rag_pipeline,
        config=config,
    )

    print("\nResults:")
    print(f"  Success Rate: {result.success_rate:.2%}")

    # Analyze pipeline bottlenecks
    analysis = runner.analyze_pipeline_bottlenecks(result)
    print("\n  Pipeline Analysis:")
    for stage, data in analysis.items():
        if stage != "bottleneck":
            print(f"    {stage}:")
            for key, value in data.items():
                if isinstance(value, float):
                    print(f"      {key}: {value:.2f}ms")

    if "bottleneck" in analysis:
        bottleneck = analysis["bottleneck"]
        print(
            f"\n  Bottleneck: {bottleneck['stage']} ({bottleneck['percentage']:.1f}%)"
        )


async def example_4_robustness():
    """Example 4: Robustness testing."""
    print("\n" + "=" * 60)
    print("Example 4: Robustness Testing")
    print("=" * 60)

    runner = RobustnessRunner()
    config = RunnerConfig(
        max_samples=5,
        k_values=[5],
    )

    loader = HuggingFaceDatasetLoader(
        name="trivia_qa_sample",
        dataset_path="trivia_qa",
        config_name="unfiltered.nocontext",
        column_mapping={
            "query": "question",
            "answer": "answer.value",
        },
    )

    print("Running robustness evaluation...")
    result = await runner.run(
        dataset=loader.load(split=DatasetSplit.VALIDATION, max_samples=5),
        rag_pipeline=mock_rag_pipeline,
        config=config,
        noise_level=0.1,
        test_types=["typo", "noise", "ambiguous"],
    )

    print("\nResults:")
    print(f"  Success Rate: {result.success_rate:.2%}")

    if result.aggregated_metrics:
        robustness = result.aggregated_metrics
        print("\n  Robustness Scores:")
        for test_type, metrics in robustness.items():
            if test_type != "overall_robustness":
                print(f"    {test_type}:")
                for metric, values in metrics.items():
                    if isinstance(values, dict) and "mean" in values:
                        print(f"      {metric}: {values['mean']:.4f}")

        if "overall_robustness" in robustness:
            print(
                f"\n  Overall Robustness: {robustness['overall_robustness']['mean']:.4f}"
            )


async def example_5_metrics_only():
    """Example 5: Using metrics directly."""
    print("\n" + "=" * 60)
    print("Example 5: Using Metrics Directly")
    print("=" * 60)

    # Retrieval metrics
    retrieval = RetrievalMetrics()

    retrieved = ["doc1", "doc2", "doc3", "doc4", "doc5"]
    relevant = ["doc1", "doc3", "doc6"]

    print("\nRetrieval Metrics:")
    print(f"  Retrieved: {retrieved}")
    print(f"  Relevant: {relevant}")

    # Compute individual metrics
    recall = retrieval.recall_at_k(retrieved, relevant, k=5)
    print(f"  Recall@5: {recall.score:.4f}")

    precision = retrieval.precision_at_k(retrieved, relevant, k=5)
    print(f"  Precision@5: {precision.score:.4f}")

    mrr = retrieval.mrr(retrieved, relevant)
    print(f"  MRR: {mrr.score:.4f}")

    # Compute all metrics
    all_metrics = retrieval.compute_all(retrieved, relevant, k_values=[1, 3, 5])
    print("\n  All Metrics:")
    for name, result in all_metrics.items():
        print(f"    {name}: {result.score:.4f}")

    # Generation metrics
    generation = GenerationMetrics()

    query = "What is RAG?"
    answer = "RAG stands for Retrieval-Augmented Generation, combining retrieval with generation."
    contexts = [
        "RAG is a technique that retrieves documents before generating answers."
    ]
    reference = "Retrieval-Augmented Generation (RAG) combines retrieval systems with generative models."

    print("\nGeneration Metrics:")
    print(f"  Query: {query}")
    print(f"  Answer: {answer}")

    faithfulness = generation.faithfulness(answer, contexts)
    print(f"  Faithfulness: {faithfulness.score:.4f}")

    relevancy = generation.answer_relevancy(query, answer)
    print(f"  Answer Relevancy: {relevancy.score:.4f}")

    f1 = generation.f1_score(answer, reference)
    print(f"  F1 Score: {f1.score:.4f}")


async def example_6_aggregation():
    """Example 6: Aggregating results across runs."""
    print("\n" + "=" * 60)
    print("Example 6: Aggregating Results")
    print("=" * 60)

    aggregator = MetricsAggregator()

    # Simulate adding results from multiple runs
    for i in range(3):
        run_results = {
            "recall@5": 0.75 + i * 0.05,
            "precision@5": 0.65 + i * 0.03,
            "f1": 0.70 + i * 0.04,
            "faithfulness": 0.80 + i * 0.02,
        }
        aggregator.add_run(
            run_id=f"run_{i + 1}",
            results=run_results,
            metadata={"model": f"v{i + 1}"},
        )

    # Aggregate
    aggregated = aggregator.aggregate()

    print("\nAggregated Statistics:")
    for metric, result in aggregated.items():
        print(f"  {metric}:")
        print(f"    Mean: {result.mean:.4f}")
        print(f"    Std: {result.std:.4f}")
        print(f"    Range: [{result.min:.4f}, {result.max:.4f}]")

    # Compare runs
    comparison = aggregator.compare_runs("run_1", "run_3")
    print("\nComparison (run_1 vs run_3):")
    for metric, data in comparison.items():
        change = "↑" if data["improved"] else "↓"
        print(
            f"  {metric}: {data['run_1_score']:.4f} → {data['run_2_score']:.4f} "
            f"({data['percent_change']:+.1f}%) {change}"
        )


async def example_7_vietnamese_dataset():
    """Example 7: Evaluating on Vietnamese dataset."""
    print("\n" + "=" * 60)
    print("Example 7: Vietnamese Dataset Evaluation")
    print("=" * 60)

    # Vietnamese dataset loader
    loader = HuggingFaceDatasetLoader(
        name="uit_viquad",
        dataset_path="uitnlp/viquad",
        column_mapping={
            "query": "question",
            "answer": "answers.text",
            "contexts": "context",
        },
        dataset_info=DatasetInfo(
            name="uit_viquad",
            description="Vietnamese QA dataset",
            language="vi",
            task_type="qa",
        ),
    )

    _runner = StandardQARunner()
    _config = RunnerConfig(
        max_samples=5,
        k_values=[1, 5, 10],
    )

    print("Running evaluation on Vietnamese dataset...")
    print(f"Dataset info: {loader.info()}")

    # Note: This would require actual Vietnamese RAG pipeline
    print("(Skipping actual run - requires Vietnamese RAG pipeline)")


async def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("KARAG RAG Evaluation Framework - Usage Examples")
    print("=" * 60)

    try:
        await example_1_basic_evaluation()
    except Exception as e:
        print(f"Example 1 failed (expected if datasets not downloaded): {e}")

    try:
        await example_2_retrieval_only()
    except Exception as e:
        print(f"Example 2 failed (expected if datasets not downloaded): {e}")

    try:
        await example_3_end_to_end()
    except Exception as e:
        print(f"Example 3 failed (expected if datasets not downloaded): {e}")

    try:
        await example_4_robustness()
    except Exception as e:
        print(f"Example 4 failed (expected if datasets not downloaded): {e}")

    # These don't require datasets
    await example_5_metrics_only()
    await example_6_aggregation()
    await example_7_vietnamese_dataset()

    print("\n" + "=" * 60)
    print("All examples completed!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
