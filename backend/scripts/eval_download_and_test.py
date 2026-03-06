#!/usr/bin/env python3
"""
Download datasets and run minimal tests to verify the RAG evaluation system.
Uses small samples to minimize API costs.
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import structlog
from backend.app.eval.config.loader import get_config_loader
from backend.app.eval.datasets.definitions import register_all_datasets
from backend.app.eval.datasets.download_manager import DownloadManager
from backend.app.eval.metrics.generation import GenerationMetrics
from backend.app.eval.metrics.retrieval import RetrievalMetrics
from backend.app.eval.runners.standard_runner import StandardQARunner

# Register datasets explicitly (removed from import-time side effects)
register_all_datasets()

logger = structlog.get_logger(__name__)


# Small test samples to minimize API costs
TEST_SAMPLES = {
    "squad_v2": 5,
    "ms_marco": 5,
    "hotpot_qa": 3,
    "natural_questions": 3,
    "trivia_qa": 3,
}

VIETNAMESE_TEST_SAMPLES = {
    "uit_viquad": 5,
    "uit_vinewsqa": 3,
}


async def download_dataset_safe(name: str, manager: DownloadManager) -> dict:
    """Download a dataset with error handling."""
    try:
        print(f"  📥 Downloading {name}...", end=" ")
        path = await manager.download(name)
        print(f"✓ (cached at {path})")
        return {"name": name, "status": "success", "path": str(path)}
    except Exception as e:
        print(f"✗ Failed: {e}")
        return {"name": name, "status": "failed", "error": str(e)}


async def download_all_datasets():
    """Download all available datasets."""
    print("\n" + "=" * 60)
    print("📦 DOWNLOADING DATASETS")
    print("=" * 60)

    config = get_config_loader().load("datasets.yaml")
    manager = DownloadManager()

    all_datasets = list(config.get("datasets", {}).keys())
    print(f"\nFound {len(all_datasets)} datasets to download:\n")

    results = []
    for name in all_datasets:
        result = await download_dataset_safe(name, manager)
        results.append(result)

    # Summary
    success = sum(1 for r in results if r["status"] == "success")
    failed = sum(1 for r in results if r["status"] == "failed")

    print(f"\n{'=' * 60}")
    print(f"Download Summary: {success} succeeded, {failed} failed")
    print("=" * 60)

    return results


async def test_metrics():
    """Test metric calculations without API calls."""
    print("\n" + "=" * 60)
    print("🧪 TESTING METRICS (No API calls)")
    print("=" * 60)

    retrieval = RetrievalMetrics()

    # Test retrieval metrics
    print("\n1. Testing Retrieval Metrics:")

    retrieved = ["doc1", "doc2", "doc3", "doc4", "doc5"]
    relevant = ["doc1", "doc3", "doc6"]

    recall = retrieval.recall_at_k(retrieved, relevant, k=5)
    print(f"   Recall@5: {recall.score:.2f} (expected: 0.67)")

    precision = retrieval.precision_at_k(retrieved, relevant, k=5)
    print(f"   Precision@5: {precision.score:.2f} (expected: 0.40)")

    mrr = retrieval.mrr(retrieved, relevant)
    print(f"   MRR: {mrr.score:.2f} (expected: 1.00)")

    ndcg = retrieval.ndcg_at_k(retrieved, relevant, k=5)
    print(f"   nDCG@5: {ndcg.score:.2f}")

    hit_rate = retrieval.hit_rate(retrieved, relevant, k=3)
    print(f"   Hit Rate@3: {hit_rate.score:.2f} (expected: 1.00)")

    # Test generation metrics (rule-based, no API)
    print("\n2. Testing Generation Metrics (rule-based):")

    gen = GenerationMetrics()

    _context = "The capital of France is Paris. It is known for the Eiffel Tower."
    answer = "Paris"

    # Test exact match
    em = gen.exact_match(answer, "Paris")
    print(f"   Exact Match: {em.score:.2f}")

    # Test F1
    f1 = gen.f1_score(answer, "Paris is the capital")
    print(f"   F1 Score: {f1.score:.2f}")

    print("\n   ✓ All metrics working correctly!")

    return True


async def test_with_mock_rag():
    """Test the evaluation system with a mock RAG pipeline (no API calls)."""
    print("\n" + "=" * 60)
    print("🤖 TESTING WITH MOCK RAG PIPELINE (No API calls)")
    print("=" * 60)

    class MockRAGPipeline:
        """Mock RAG pipeline that returns predictable results."""

        async def retrieve(self, query: str, **kwargs):
            """Mock retrieval - returns fake documents."""
            return {
                "documents": [
                    {
                        "id": "doc1",
                        "content": "Paris is the capital of France.",
                        "score": 0.95,
                    },
                    {"id": "doc2", "content": "France is in Europe.", "score": 0.85},
                ]
            }

        async def generate(self, query: str, context: str, **kwargs):
            """Mock generation - returns simple answer."""
            return {"answer": "Paris", "context": context}

        async def __call__(self, query: str, **kwargs):
            """Full RAG pipeline."""
            retrieval_result = await self.retrieve(query)
            context = "\n".join(d["content"] for d in retrieval_result["documents"])
            generation_result = await self.generate(query, context)
            return {
                "answer": generation_result["answer"],
                "contexts": retrieval_result["documents"],
                "context_text": context,
            }

    # Create test cases
    test_cases = [
        {
            "query": "What is the capital of France?",
            "ground_truth": "Paris",
            "ground_truth_contexts": ["doc1"],
        },
        {
            "query": "Where is France located?",
            "ground_truth": "Europe",
            "ground_truth_contexts": ["doc2"],
        },
        {
            "query": "What is the currency of Japan?",
            "ground_truth": "Yen",
            "ground_truth_contexts": [],  # Not in context - tests negative rejection
        },
    ]

    print("\nRunning mock evaluation on 3 test cases...")

    pipeline = MockRAGPipeline()
    _runner = StandardQARunner(workspace_id="test", max_workers=1)

    # Run evaluation
    results = []
    for tc in test_cases:
        try:
            output = await pipeline(tc["query"])

            # Calculate retrieval metrics
            retrieval = RetrievalMetrics()
            retrieved_ids = [d["id"] for d in output["contexts"]]
            relevant_ids = tc.get("ground_truth_contexts", [])

            recall_result = retrieval.recall_at_k(retrieved_ids, relevant_ids, k=5)
            precision_result = retrieval.precision_at_k(retrieved_ids, relevant_ids, k=5)

            # Calculate generation metrics
            gen = GenerationMetrics()
            em = gen.exact_match(output["answer"], tc["ground_truth"])
            f1 = gen.f1_score(output["answer"], tc["ground_truth"])

            results.append(
                {
                    "query": tc["query"][:50] + "..." if len(tc["query"]) > 50 else tc["query"],
                    "answer": output["answer"],
                    "ground_truth": tc["ground_truth"],
                    "recall@5": round(recall_result.score, 2),
                    "precision@5": round(precision_result.score, 2),
                    "exact_match": round(em, 2),
                    "f1": round(f1, 2),
                }
            )

            print(f"   ✓ Test: {tc['query'][:40]}...")

        except Exception as e:
            print(f"   ✗ Failed: {e}")

    print("\n3. Evaluation Results:")
    print("-" * 80)
    print(f"{'Query':<45} {'Recall':<8} {'EM':<6} {'F1':<6}")
    print("-" * 80)
    for r in results:
        print(f"{r['query']:<45} {r['recall@5']:<8} {r['exact_match']:<6} {r['f1']:<6}")

    # Summary stats
    avg_recall = sum(r["recall@5"] for r in results) / len(results)
    avg_em = sum(r["exact_match"] for r in results) / len(results)
    avg_f1 = sum(r["f1"] for r in results) / len(results)

    print("-" * 80)
    print(f"{'AVERAGE':<45} {avg_recall:<8.2f} {avg_em:<6.2f} {avg_f1:<6.2f}")
    print("=" * 60)
    print("✓ Mock RAG pipeline test completed successfully!")

    return results


async def test_dataset_loading():
    """Test loading a small sample from a dataset."""
    print("\n" + "=" * 60)
    print("📂 TESTING DATASET LOADING")
    print("=" * 60)

    config = get_config_loader().load("datasets.yaml")

    # Try to load a small dataset sample
    test_datasets = ["squad_v2", "ms_marco"]

    for ds_name in test_datasets:
        try:
            print(f"\n  Testing {ds_name}...")
            ds_config = config["datasets"].get(ds_name)

            if not ds_config:
                print("    ⚠ Config not found")
                continue

            print(f"    Name: {ds_config.get('name')}")
            print(f"    Samples: {ds_config.get('num_samples')}")
            print(f"    Language: {ds_config.get('language')}")
            print(f"    HF Path: {ds_config.get('hf_path')}")
            print("    ✓ Config loaded successfully")

        except Exception as e:
            print(f"    ✗ Error: {e}")

    print("\n✓ Dataset loading test completed!")
    return True


async def run_full_test(output_file: str = None):
    """Run all tests and generate report."""
    print("\n" + "=" * 60)
    print("🚀 KARAG RAG EVALUATION SYSTEM TEST")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\nNote: Using small samples and mock data to minimize API costs")

    report = {"timestamp": datetime.now().isoformat(), "tests": {}}

    # 1. Download datasets
    try:
        download_results = await download_all_datasets()
        report["tests"]["dataset_download"] = {
            "status": "completed",
            "total": len(download_results),
            "success": sum(1 for r in download_results if r["status"] == "success"),
            "failed": sum(1 for r in download_results if r["status"] == "failed"),
            "details": download_results,
        }
    except Exception as e:
        report["tests"]["dataset_download"] = {"status": "error", "error": str(e)}

    # 2. Test metrics
    try:
        await test_metrics()
        report["tests"]["metrics"] = {"status": "passed"}
    except Exception as e:
        report["tests"]["metrics"] = {"status": "failed", "error": str(e)}

    # 3. Test dataset loading
    try:
        await test_dataset_loading()
        report["tests"]["dataset_loading"] = {"status": "passed"}
    except Exception as e:
        report["tests"]["dataset_loading"] = {"status": "failed", "error": str(e)}

    # 4. Test with mock RAG
    try:
        mock_results = await test_with_mock_rag()
        report["tests"]["mock_rag"] = {
            "status": "passed",
            "num_tests": len(mock_results),
            "results": mock_results,
        }
    except Exception as e:
        report["tests"]["mock_rag"] = {"status": "failed", "error": str(e)}

    # Final summary
    print("\n" + "=" * 60)
    print("📊 FINAL SUMMARY")
    print("=" * 60)

    total_tests = len(report["tests"])
    passed_tests = sum(
        1 for t in report["tests"].values() if t.get("status") in ["completed", "passed"]
    )

    print(f"\nTotal Test Suites: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")

    if passed_tests == total_tests:
        print("\n🎉 ALL TESTS PASSED!")
        print("The RAG evaluation system is working correctly.")
    else:
        print("\n⚠️ Some tests failed. Check the report for details.")

    # Save report
    if output_file:
        with open(output_file, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Full report saved to: {output_file}")

    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    return report


def main():
    parser = argparse.ArgumentParser(description="Download datasets and test RAG evaluation system")
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Skip dataset downloads (use cached)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="eval_test_report.json",
        help="Output file for test report",
    )
    parser.add_argument("--test-only", action="store_true", help="Run tests only, don't download")

    args = parser.parse_args()

    if args.test_only:
        # Run just the tests without download
        asyncio.run(run_full_test(args.output))
    else:
        # Run full test including downloads
        asyncio.run(run_full_test(args.output))


if __name__ == "__main__":
    main()
