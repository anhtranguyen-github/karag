#!/usr/bin/env python3
"""
CLI script for running RAG evaluations.

Usage:
    python eval_run.py --benchmark smoke_test
    python eval_run.py --dataset ms_marco --runner standard_qa --max-samples 100
    python eval_run.py --list-benchmarks
    python eval_run.py --list-runners
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app.eval.datasets.definitions import register_all_datasets
from backend.app.eval.datasets.huggingface_loader import HuggingFaceDatasetLoader
from backend.app.eval.datasets.base import DatasetInfo, DatasetSplit
from backend.app.eval.runners.standard_runner import StandardQARunner
from backend.app.eval.runners.retrieval_runner import RetrievalRunner
from backend.app.eval.runners.end_to_end_runner import EndToEndRunner
from backend.app.eval.runners.robustness_runner import RobustnessRunner
from backend.app.eval.runners.base import RunnerConfig
from backend.app.eval.config.loader import get_config_loader
import structlog

# Register datasets explicitly (removed from import-time side effects)
register_all_datasets()

logger = structlog.get_logger(__name__)

# Registry of runners
RUNNERS = {
    "standard_qa": StandardQARunner,
    "retrieval": RetrievalRunner,
    "end_to_end": EndToEndRunner,
    "robustness": RobustnessRunner,
}


def list_benchmarks():
    """List available benchmarks."""
    config = get_config_loader().load("benchmarks.yaml")

    print("\n=== Available Benchmarks ===\n")

    for name, benchmark in config["benchmarks"].items():
        print(f"  {name}:")
        print(f"    Name: {benchmark.get('name', 'N/A')}")
        print(f"    Description: {benchmark.get('description', 'N/A')}")
        print(f"    Runner: {benchmark.get('runner', 'N/A')}")
        print(f"    Datasets: {', '.join(benchmark.get('datasets', []))}")
        print()

    print("CI Benchmark Groups:")
    for group, benchmark in config.get("ci_benchmarks", {}).items():
        print(f"  - {group}: {benchmark}")
    print()


def list_runners():
    """List available runners."""
    print("\n=== Available Runners ===\n")

    for name, runner_class in RUNNERS.items():
        print(
            f"  - {name}: {runner_class.__doc__.split(chr(10))[0] if runner_class.__doc__ else 'N/A'}"
        )
    print()


def create_dataset_loader(dataset_name: str):
    """Create a dataset loader for the given dataset name."""
    config = get_config_loader().get_dataset_config(dataset_name)

    if not config:
        raise ValueError(f"Unknown dataset: {dataset_name}")

    hf_path = config.get("hf_path")
    if not hf_path or "ambiguous" in hf_path:
        raise ValueError(
            f"Dataset {dataset_name} does not have a HuggingFace path configured"
        )

    # Create dataset info
    info = DatasetInfo(
        name=dataset_name,
        description=config.get("description", ""),
        language=config.get("language", "en"),
        task_type=config.get("task_type", "qa"),
        num_samples=config.get("num_samples"),
        domains=config.get("domains", []),
    )

    return HuggingFaceDatasetLoader(
        name=dataset_name,
        dataset_path=hf_path,
        config_name=config.get("config_name"),
        column_mapping=config.get("column_mapping"),
        dataset_info=info,
    )


async def run_benchmark(benchmark_name: str, output_file: str = None):
    """Run a predefined benchmark."""
    config = get_config_loader().load("benchmarks.yaml")

    if benchmark_name not in config["benchmarks"]:
        print(f"Unknown benchmark: {benchmark_name}")
        return False

    benchmark = config["benchmarks"][benchmark_name]
    runner_name = benchmark["runner"]
    dataset_names = benchmark["datasets"]
    runner_config = RunnerConfig(**benchmark.get("config", {}))

    print(f"Running benchmark: {benchmark.get('name', benchmark_name)}")
    print(f"Runner: {runner_name}")
    print(f"Datasets: {', '.join(dataset_names)}")
    print(f"Config: {runner_config}")
    print()

    # Create runner
    if runner_name not in RUNNERS:
        print(f"Unknown runner: {runner_name}")
        return False

    runner = RUNNERS[runner_name]()

    # Mock RAG pipeline for demonstration
    async def mock_rag_pipeline(query: str):
        """Mock RAG pipeline for testing."""
        return {
            "answer": f"Mock answer for: {query[:50]}...",
            "documents": ["doc1", "doc2", "doc3"],
            "contexts": ["Context 1", "Context 2"],
        }

    all_results = []

    for dataset_name in dataset_names:
        print(f"Evaluating on {dataset_name}...")

        try:
            loader = create_dataset_loader(dataset_name)

            result = await runner.run(
                dataset=loader.load(
                    split=DatasetSplit.TEST, max_samples=runner_config.max_samples
                ),
                rag_pipeline=mock_rag_pipeline,
                config=runner_config,
            )

            all_results.append(result)
            print(
                f"  ✓ Completed: {result.successful_samples}/{result.total_samples} successful"
            )

        except Exception as e:
            print(f"  ✗ Failed: {e}")

    # Save results
    if output_file:
        output_data = {
            "benchmark": benchmark_name,
            "results": [r.to_dict() for r in all_results],
        }

        with open(output_file, "w") as f:
            json.dump(output_data, f, indent=2)

        print(f"\nResults saved to: {output_file}")

    return True


async def main():
    parser = argparse.ArgumentParser(description="Run RAG evaluations")
    parser.add_argument("--benchmark", type=str, help="Name of benchmark to run")
    parser.add_argument(
        "--list-benchmarks", action="store_true", help="List available benchmarks"
    )
    parser.add_argument(
        "--list-runners", action="store_true", help="List available runners"
    )
    parser.add_argument("--dataset", type=str, help="Dataset to evaluate on")
    parser.add_argument("--runner", type=str, help="Runner to use")
    parser.add_argument(
        "--max-samples",
        type=int,
        default=100,
        help="Maximum number of samples to evaluate",
    )
    parser.add_argument("--output", type=str, help="Output file for results (JSON)")

    args = parser.parse_args()

    if args.list_benchmarks:
        list_benchmarks()
        return 0

    if args.list_runners:
        list_runners()
        return 0

    if args.benchmark:
        success = await run_benchmark(args.benchmark, args.output)
        return 0 if success else 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    asyncio.run(main())
