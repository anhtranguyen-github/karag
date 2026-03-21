# Changelog

All notable changes to this project will be documented here.

## [0.2.0] - 2026-03-17

### Added
- New default RAG pipeline stack: `MarkerReader`, `RecursiveChunker`, `MultiVectorEmbedder`, `QdrantVectorStore`, `JinaReranker`, `HybridRetriever`.
- `RecursiveChunker` for hierarchical text splitting to preserve semantic context.
- `LLM_BASE_URL` configuration for modular LLM provider integration.

### Changed
- Default LLM provider set to Omniroute (`cost-saver` model).
- Overhauled RAG component managers for production-ready modularity.
- Updated `OpenAIGenerator` to support local pass-through and optional API keys.
- Renamed `OMNIROUTE_BASE_URL` to `LLM_BASE_URL` in environment and settings.

### Fixed
- Assignment bug in `RagManager` during pipeline build and audit phases.
- Dependency conflict in `MarkerReader` involving `surya-ocr` and `transformers`.
