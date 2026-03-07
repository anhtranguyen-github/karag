# KARAG RAG Evaluation Framework

Comprehensive RAG (Retrieval-Augmented Generation) evaluation framework for the KARAG project. Supports both English and Vietnamese datasets with extensive metrics for retrieval and generation quality.

## Overview

This framework provides:

- **Dataset Management**: Downloaders and loaders for popular RAG benchmarks
- **Comprehensive Metrics**: Both traditional IR metrics and modern RAGAS-style metrics
- **Multiple Runners**: Different evaluation scenarios (standard QA, retrieval-only, end-to-end, robustness)
- **Configuration System**: YAML-based configuration for datasets, metrics, and benchmarks
- **CLI Tools**: Scripts for downloading datasets, running evaluations, and generating reports

## Supported Datasets

### English Datasets

| Dataset | Samples | Type | Domain |
|---------|---------|------|--------|
| MS MARCO | 100K+ | Retrieval | Web Search |
| SQuAD 2.0 | 150K | QA | Wikipedia |
| HotpotQA | 90K | QA | Multi-hop |
| Natural Questions | 300K | QA | Search Queries |
| TriviaQA | 650K | QA | Trivia |
| RGB | 600+ | RAG | General |
| CRAG | 4,409 | RAG | Multi-domain |
| BEIR | 17 subsets | Retrieval | Various |

### Vietnamese Datasets

| Dataset | Samples | Type | Domain |
|---------|---------|------|--------|
| UIT-ViQuAD | 23,000 | QA | Wikipedia |
| UIT-ViNewsQA | 22,077 | QA | Medical News |
| ViFactCheck | 7,232 | Fact-checking | News |
| VSMRC | 16,347 | Multiple-choice | General |
| ViMedRetrieve | 44,000 | Retrieval | Medical |

## Installation

The evaluation framework is included in the KARAG backend. The required dependencies are:

```bash
# Install evaluation dependencies
pip install ragas datasets bert-score sacrebleu nltk

# Download NLTK data (for tokenization)
python -c "import nltk; nltk.download('punkt')"
```

## Quick Start

### 1. List Available Datasets

```bash
python src/backend/scripts/eval_download.py --list
```

### 2. Download a Dataset

```bash
# Download single dataset
python src/backend/scripts/eval_download.py --dataset ms_marco

# Download a group of datasets
python src/backend/scripts/eval_download.py --dataset-group english_qa

# Download all datasets
python src/backend/scripts/eval_download.py --all
```

### 3. Run Evaluation

```bash
# Run a predefined benchmark
python src/backend/scripts/eval_run.py --benchmark smoke_test

# List available benchmarks
python src/backend/scripts/eval_run.py --list-benchmarks

# Run with custom settings
python src/backend/scripts/eval_run.py --dataset ms_marco --runner standard_qa --max-samples 100 --output results.json
```

### 4. Generate Report

```bash
# Generate markdown report
python src/backend/scripts/eval_report.py --input results.json --format markdown

# Compare two runs
python src/backend/scripts/eval_report.py --compare baseline.json new.json --output comparison.md
```

## Usage Examples

### Basic Evaluation (Python API)

```python
import asyncio
from src.backend.app.eval import (
    StandardQARunner,
    RunnerConfig,
    DatasetSplit,
)
from src.backend.app.eval.datasets import dataset_registry
from src.backend.app.eval.datasets.huggingface_loader import HuggingFaceDatasetLoader

async def evaluate_rag():
    # Create dataset loader
    loader = HuggingFaceDatasetLoader(
        name="ms_marco",
        dataset_path="microsoft/ms_marco",
        config_name="v1.1",
        column_mapping={
            "query": "query",
            "answer": "answers",
            "contexts": "passages",
        }
    )
    
    # Define your RAG pipeline
    async def my_rag_pipeline(query: str):
        # Your RAG implementation
        return {
            "answer": "Generated answer...",
            "documents": ["doc1", "doc2", "doc3"],
            "contexts": ["Context 1...", "Context 2..."],
        }
    
    # Create runner and configure
    runner = StandardQARunner()
    config = RunnerConfig(
        max_samples=100,
        k_values=[1, 5, 10],
        compute_retrieval_metrics=True,
        compute_generation_metrics=True,
    )
    
    # Run evaluation
    result = await runner.run(
        dataset=loader.load(split=DatasetSplit.TEST, max_samples=100),
        rag_pipeline=my_rag_pipeline,
        config=config,
    )
    
    # Print results
    print(f"Success rate: {result.success_rate:.2%}")
    print(f"Aggregated metrics: {result.aggregated_metrics}")
    
    return result

# Run
result = asyncio.run(evaluate_rag())
```

### Using Predefined Benchmarks

```python
from src.backend.app.eval.config.loader import get_config_loader
from src.backend.app.eval.runners import StandardQARunner, RunnerConfig

# Load benchmark configuration
config_loader = get_config_loader()
benchmark_config = config_loader.get_benchmark_config("standard_qa")

# Create runner with benchmark settings
runner = StandardQARunner()
config = RunnerConfig(**benchmark_config["config"])
```

### Custom Metrics

```python
from src.backend.app.eval.metrics import RetrievalMetrics, GenerationMetrics

# Retrieval metrics
retrieval = RetrievalMetrics()
result = retrieval.recall_at_k(
    retrieved_doc_ids=["doc1", "doc2", "doc3"],
    relevant_doc_ids=["doc1", "doc4"],
    k=5,
)
print(f"Recall@5: {result.score:.4f}")

# Generation metrics
generation = GenerationMetrics()
result = generation.faithfulness(
    answer="The answer...",
    contexts=["Context 1...", "Context 2..."],
)
print(f"Faithfulness: {result.score:.4f}")

# Compute all metrics at once
all_retrieval = retrieval.compute_all(
    retrieved_doc_ids=["doc1", "doc2", "doc3"],
    relevant_doc_ids=["doc1", "doc4"],
    k_values=[1, 5, 10],
)
```

## Metrics Reference

### Retrieval Metrics

| Metric | Description | Range |
|--------|-------------|-------|
| `recall@k` | Proportion of relevant docs retrieved | [0, 1] |
| `precision@k` | Proportion of retrieved docs that are relevant | [0, 1] |
| `ndcg@k` | Normalized Discounted Cumulative Gain | [0, 1] |
| `mrr` | Mean Reciprocal Rank | [0, 1] |
| `hit_rate@k` | At least one relevant doc retrieved | [0, 1] |
| `map` | Mean Average Precision | [0, 1] |

### Generation Metrics (RAGAS-style)

| Metric | Description | Range |
|--------|-------------|-------|
| `faithfulness` | Answer grounded in context | [0, 1] |
| `answer_relevancy` | Answer addresses query | [0, 1] |
| `context_precision` | Signal-to-noise in contexts | [0, 1] |
| `context_recall` | Coverage of ground truth | [0, 1] |

### End-to-End Metrics

| Metric | Description | Range |
|--------|-------------|-------|
| `exact_match` | Exact string match | {0, 1} |
| `f1_score` | Token-level F1 | [0, 1] |
| `answer_similarity` | Semantic similarity | [0, 1] |

## Available Runners

| Runner | Description | Use Case |
|--------|-------------|----------|
| `StandardQARunner` | Standard QA evaluation | General RAG evaluation |
| `RetrievalRunner` | Retrieval-only metrics | Testing retrieval components |
| `EndToEndRunner` | Full pipeline with intermediate results | Debugging pipeline issues |
| `RobustnessRunner` | Noise and adversarial testing | Testing robustness |

## Configuration

### Dataset Configuration

Edit `src/backend/app/eval/config/datasets.yaml` to add new datasets:

```yaml
datasets:
  my_dataset:
    name: "My Dataset"
    description: "Description"
    language: "en"
    task_type: "qa"
    hf_path: "org/dataset"
    column_mapping:
      query: "question"
      answer: "answers"
      contexts: "context"
```

### Benchmark Configuration

Edit `src/backend/app/eval/config/benchmarks.yaml` to define benchmarks:

```yaml
benchmarks:
  my_benchmark:
    name: "My Benchmark"
    runner: "standard_qa"
    datasets:
      - ms_marco
      - squad_v2
    config:
      max_samples: 1000
      k_values: [1, 5, 10]
```

## Directory Structure

```
src/backend/app/eval/
├── __init__.py              # Package exports
├── datasets/                # Dataset loaders
│   ├── __init__.py
│   ├── base.py             # Base dataset loader
│   ├── huggingface_loader.py
│   ├── download_manager.py
│   ├── registry.py
│   └── definitions.py      # Dataset registrations
├── metrics/                 # Evaluation metrics
│   ├── __init__.py
│   ├── retrieval.py        # IR metrics
│   ├── generation.py       # RAGAS metrics
│   └── aggregator.py       # Results aggregation
├── runners/                 # Evaluation runners
│   ├── __init__.py
│   ├── base.py             # Base runner
│   ├── standard_runner.py
│   ├── retrieval_runner.py
│   ├── end_to_end_runner.py
│   └── robustness_runner.py
└── config/                  # Configuration files
    ├── __init__.py
    ├── loader.py
    ├── datasets.yaml
    ├── metrics.yaml
    └── benchmarks.yaml
```

## Advanced Usage

### Custom Dataset Loader

```python
from src.backend.app.eval.datasets import BaseDatasetLoader, DatasetEntry, DatasetSplit

class MyDatasetLoader(BaseDatasetLoader):
    async def load(self, split=DatasetSplit.TEST, max_samples=None, **kwargs):
        # Load your data
        for i, item in enumerate(my_data):
            if max_samples and i >= max_samples:
                break
            yield DatasetEntry(
                id=f"item_{i}",
                query=item["question"],
                answer=item["answer"],
                contexts=item["contexts"],
            )
    
    def info(self):
        return DatasetInfo(
            name="my_dataset",
            description="My custom dataset",
            language="en",
            task_type="qa",
        )

# Register
dataset_registry.register("my_dataset", MyDatasetLoader)
```

### Custom Runner

```python
from src.backend.app.eval.runners import BaseRunner, RunnerConfig, RunnerResult

class MyRunner(BaseRunner):
    async def run(self, dataset, rag_pipeline, config):
        result = self._create_result("my_dataset", config)
        # Your evaluation logic
        return result
```

## Integration with Existing Eval Service

The evaluation framework integrates with the existing `eval_service.py`:

```python
from src.backend.app.services.eval_service import eval_service
from src.backend.app.eval import StandardQARunner, RunnerConfig

# Use evaluation framework within existing service
async def run_enhanced_evaluation(dataset_id: str, workspace_id: str):
    # Get dataset from eval_service
    dataset = await eval_service.get_dataset(dataset_id)
    
    # Run with evaluation framework
    runner = StandardQARunner()
    config = RunnerConfig(max_samples=100)
    
    result = await runner.run(
        dataset=convert_to_dataset_entries(dataset),
        rag_pipeline=workspace_rag_pipeline,
        config=config,
    )
    
    return result
```

## Citation

If you use this evaluation framework in your research, please cite:

```bibtex
@software{karag_eval,
  title = {KARAG RAG Evaluation Framework},
  author = {KARAG Team},
  year = {2024},
}
```

## License

MIT License - see project root for details.

