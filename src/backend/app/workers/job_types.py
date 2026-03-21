"""Job type constants and helpers for the messaging layer."""
from __future__ import annotations

# Job types — the contract between producers (services) and consumers (workers)
DOCUMENT_INGEST = "document.ingest"
DOCUMENT_DELETE = "document.delete"
RAG_QUERY = "rag.query"
