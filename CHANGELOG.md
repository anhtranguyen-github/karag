# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive RAG (Retrieval-Augmented Generation) evaluation framework
  - Dataset management with support for 15+ datasets (English and Vietnamese)
  - Retrieval metrics: Recall@k, Precision@k, nDCG, MRR, MAP, Hit Rate
  - Generation metrics: Faithfulness, Answer Relevancy, BLEU, ROUGE, BERTScore
  - Multiple evaluation runners: StandardQA, Retrieval, EndToEnd, Robustness
  - CLI scripts for dataset download, evaluation running, and report generation
  - HTML dashboard for visualization of evaluation results
  - YAML-based configuration for datasets, metrics, and benchmarks
- New Python dependencies for evaluation:
  - `bert-score>=0.3.13` for semantic similarity
  - `datasets>=3.0.0` for HuggingFace dataset loading
  - `nltk>=3.9` for tokenization
  - `ragas>=0.2.0` for RAGAS metrics
  - `sacrebleu>=2.4.0` for BLEU score calculation

### Fixed
- **huggingface_loader.py**: Added `hasattr(dataset, 'keys')` check before accessing `dataset.keys()` to prevent TypeError on streaming datasets
- **__init__.py**: Removed import-time side effects by making dataset registration explicit via `register_all_datasets()` function
- **end_to_end_runner.py**: Added memory limit for intermediate results storage using `max_intermediate_samples` configuration (default: 1000)
- **config/loader.py**: Added explicit `encoding='utf-8'` for config file reading to ensure cross-platform compatibility
- **download_manager.py**: Added `KARAG_CACHE_DIR` environment variable override for cache directory path, supporting restricted environments like containers

## [0.1.0] - 2026-03-04

### Added
- Initial release of KARAG (Knowledge-Augmented Retrieval and Generation)
- Core RAG pipeline implementation
- Document ingestion and processing
- Vector store integration with Qdrant
- Graph database integration with Neo4j
- RESTful API with FastAPI
- WebSocket support for real-time chat
- Multiple LLM provider support (OpenAI, Anthropic, Ollama, etc.)
- Authentication and authorization
- Workspace-based multi-tenancy
