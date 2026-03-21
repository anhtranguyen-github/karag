#!/usr/bin/env python3
"""Quick runner: SimplePdfReader -> SemanticChunker for local PDF debugging.

This script reads `.docs/1906.05799v4.pdf` into memory, uses
`SimplePdfReader` to extract text, then `SemanticChunker` to split into
chunks. It prints a short report of sizes and a sample chunk.
"""

from __future__ import annotations

import time
from pathlib import Path
import sys

# Ensure backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.rag.components.readers.simple_pdf_reader import SimplePdfReader
from app.core.rag.components.chunkers.semantic_chunker import SemanticChunker
from app.core.rag.schemas import FileConfig, FileStatus
from app.core.rag.documents import create_document
from app.core.rag.pipeline_models import RAGDocument


PDF_PATH = Path(__file__).resolve().parents[3] / ".docs" / "1906.05799v4.pdf"


def build_file_config(path: Path, content: bytes) -> FileConfig:
    return FileConfig(
        fileID=f"local-{path.name}",
        filename=path.name,
        isURL=False,
        overwrite=True,
        extension=path.suffix.lstrip('.'),
        source=str(path),
        content=content,
        labels=[],
        rag_config={},
        file_size=len(content),
        status=FileStatus.PROCESSING,
        metadata="{}",
        status_report={},
    )


def to_rag_document(doc) -> RAGDocument:
    return RAGDocument(
        document_id=doc.file_id,
        workspace_id="local",
        content=doc.content,
        title=doc.title,
        source=doc.source,
        labels=list(doc.labels),
        metadata={
            "extension": doc.extension,
            "file_size": doc.file_size,
        },
    )


def main() -> None:
    if not PDF_PATH.exists():
        print(f"PDF not found: {PDF_PATH}")
        raise SystemExit(1)

    content = PDF_PATH.read_bytes()
    file_config = build_file_config(PDF_PATH, content)

    # 1. Read
    reader = SimplePdfReader({})
    reader.check_dependencies()
    t0 = time.perf_counter()
    documents = reader.read(file_config, {})
    read_elapsed = time.perf_counter() - t0

    print("\n--- Reader Report ---")
    print(f"Reader: {reader.name}")
    print(f"Documents produced: {len(documents)}")
    if documents:
        print(f"Chars total (first doc): {len(documents[0].content):,}")
    print(f"Elapsed: {read_elapsed:.2f}s")

    # 2. Convert + Chunk
    rag_doc = to_rag_document(documents[0])
    chunker = SemanticChunker({"chunking": {"chunk_size": 150}})
    chunker.check_dependencies()
    t0 = time.perf_counter()
    out = chunker.chunk([rag_doc], {"chunking": {"chunk_size": 150}})
    chunk_elapsed = time.perf_counter() - t0

    chunks = out[0].chunks if out else []
    print("\n--- Chunker Report ---")
    print(f"Chunk size (words): 150")
    print(f"Num chunks: {len(chunks)}")
    print(f"Elapsed: {chunk_elapsed:.3f}s")
    if chunks:
        sample = chunks[0].content
        print('\nSample chunk (first 400 chars):\n')
        print(sample[:400] + ("..." if len(sample) > 400 else ""))


if __name__ == "__main__":
    main()
