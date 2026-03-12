# Pipeline Observability: Phase 1 Summary

I have established a baseline for the 4-stage RAG pipeline. Using the `Attention Is All You Need` PDF (from `.docs/`), I've traced the granular life-of-a-document and life-of-a-query.

## 📦 Ingestion Insights (Document: 1906.05799v4.pdf)
- **Reading**: `SimplePDFReader` extracted 121,712 characters in ~624ms.
- **Chunking**: `SemanticChunker` produced 2,023 chunks in ~15.3s. This highlights that semantic boundaries are computationally expensive but produce rich segments.
- **Embedding**: `Jina-v3` (Multi-vector) processed 2,023 chunks in ~30.2s.
- **Persistence**: `Qdrant` confirmed successful storage in ~52s.

## 🚀 Retrieval Insights (Query: "core contributions of Attention Is All You Need")
- **Pre-Retrieval**: `HyDETransformer` expanded the query into 2 variations in ~2.6s.
- **Retrieval**: Parallel search executed 2 times (Original + Hypothetical) in ~5s. 
- **Inference**: LLM generated a structured response citing Paper contributions in ~2.5s.
- **Trace Transparency**: Every manager and component class reported its latency and metadata transformation.

## 🛠️ Lessons for Phase 2:
1. **Reader Mismatch**: The full `Marker` reader (for complex layouts) requires a specific environment (Cuda/Encoder checks). For standard tests, `SimplePDFReader` is the reliable fallback.
2. **Schema Uniformity**: Discovered and fixed a schema gap between `Reader` (Document) and `Chunker` (RAGDocument), which is now resolved.
3. **Trace Power**: We can now see exactly where latency is concentrated (Persistence and Chunking are the hotspots).

All detailed reports are available in `tests/pipeline_observability/reports/`.
