# Pipeline Observability: Phase 2 Live Ingest Verification

Date: 2026-03-23

## Scope

This report captures the current verified state of the live document ingestion path after fixing the `marker` / `surya` runtime compatibility issue and adding persistent document-status tracking.

## Verified Result

- Full live ingestion completed successfully for `.docs/lap-trinh-mang_luong-anh-hoang_de-4 - [cuuduongthancong.com].pdf`.
- The verified ingest stack was:
  - `MarkerReader`
  - `RecursiveChunker`
  - `LocalEmbedder`
  - `PgVectorVectorStore` using its in-memory fallback path
- Final persisted states:
  - document status: `completed`
  - ingestion job status: `completed`
  - RAG document status: `completed`
  - RAG progress: `100`
  - RAG chunk count: `1`

## Persistent Status Lifecycle

The `documents.status` field is now persisted through the upload and ingestion lifecycle:

`uploading -> uploaded -> queued -> processing -> completed|failed`

Observed live transitions for the verified run:

1. `uploaded`
2. `queued`
3. `processing`
4. `completed`

## Runtime Notes

- The run used the real Marker OCR path, not a stubbed reader.
- Cold-start model loading and OCR dominated runtime.
- Observed total runtime from queueing to completion was approximately 3 minutes 15 seconds.
- The main expensive stages were layout recognition, text detection, and OCR text recognition.

## Compatibility Notes

- `surya` required a local compatibility shim for newer `transformers` behavior:
  - `SuryaOCRConfig.__init__`
  - `SuryaOCRConfig.get_text_config()`
- `marker-pdf` in the current environment does not ship a built-in OpenAI-compatible LLM service adapter.
- A local OmniRoute Marker service was added for OpenAI-compatible routing:
  - `/home/tra01/project/karag/src/backend/app/rag/components/readers/marker_omniroute_service.py`

## Limits Of This Verification

- This report verifies the live ingest path and persistent statuses.
- It does not certify the default production stack end to end (`SemanticChunker` + remote embedder + Qdrant + reranker + generation).
- The dedicated `.docs` script `src/backend/scripts/test_real_docs.py` is still not a reliable verifier in its current form because it references `tiny_test.pdf`, which is not present in `.docs/`.
