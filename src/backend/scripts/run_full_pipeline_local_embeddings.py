#!/usr/bin/env python3
"""Run ingestion -> local-embed retrieval -> generation (OmniRoute LLM).

Embeddings are produced locally (deterministic hash->float vector) because
the OmniRoute instance lacks embedding provider credentials. The generator
and HyDE steps use the real LLM at `LLM_BASE_URL`.
"""

from __future__ import annotations

import asyncio
import hashlib
import math
import os
from pathlib import Path
import time

from app.core.rag.components.readers.simple_pdf_reader import SimplePdfReader
from app.core.rag.components.chunkers.semantic_chunker import SemanticChunker
from app.core.rag.types import ChatMessage, RetrievedChunk

from app.core.rag.managers.generator_manager import GeneratorManager


PDF_PATH = Path(__file__).resolve().parents[3] / ".docs" / "1906.05799v4.pdf"
PROMPT_TEMPLATE = (
    "You are a research assistant. Answer the question using only the context below.\n\n"
    "Context:\n{context}\n\n"
    "Question: {question}\n\n"
    "Answer:"
)


def local_embed(text: str, dim: int = 128) -> list[float]:
    # Deterministic pseudo-embedding via repeated SHA256 hashes.
    out = bytearray()
    seed = text.encode("utf-8")
    i = 0
    while len(out) < dim:
        h = hashlib.sha256(seed + i.to_bytes(2, "little")).digest()
        out.extend(h)
        i += 1
    vec = [((b / 255.0) * 2.0 - 1.0) for b in out[:dim]]
    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


async def main():
    if not PDF_PATH.exists():
        print(f"PDF not found: {PDF_PATH}")
        raise SystemExit(1)

    # Read
    content = PDF_PATH.read_bytes()
    file_config = type("FC", (), {})()
    file_config.filename = PDF_PATH.name
    file_config.extension = PDF_PATH.suffix.lstrip('.')
    file_config.content = content
    file_config.file_size = len(content)
    file_config.labels = []
    file_config.file_id = f"local-{PDF_PATH.name}"
    file_config.source = str(PDF_PATH)
    file_config.metadata = "{}"

    reader = SimplePdfReader({})
    reader.check_dependencies()
    docs = reader.read(file_config, {})
    if not docs:
        print("No documents produced by reader")
        return

    # Chunk
    chunker = SemanticChunker({"chunking": {"chunk_size": 150}})
    docs_rag = [type("D", (), {
        "file_id": d.file_id,
        "title": d.title,
        "content": d.content,
    }) for d in docs]
    rag_docs = [type("R", (), {"document_id": docs_rag[0].file_id, "content": docs_rag[0].content})]
    # Use chunker directly
    t0 = time.perf_counter()
    rag_doc = rag_docs[0]
    chunks = chunker._chunk_text(rag_doc.content, rag_doc.document_id)
    print(f"Read {len(docs[0].content):,} chars → {len(chunks)} chunks in {time.perf_counter()-t0:.2f}s")

    # Local embeddings for chunks
    chunk_records: list[tuple[RetrievedChunk, list[float]]] = []
    for c in chunks:
        vec = local_embed(c.content, dim=128)
        rc = RetrievedChunk(chunk_id=c.chunk_id, document_id=c.document_id, document_title=c.title or "", text=c.content, score=0.0)
        chunk_records.append((rc, vec))

    # Build rag_config for generator (use OmniRoute)
    llm_base = os.getenv("LLM_BASE_URL") or os.getenv("OPENAI_BASE_URL") or ""
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_KEY") or ""
    model_name = os.getenv("DEFAULT_LLM_MODEL") or os.getenv("LLM_MODEL") or "cost-saver"
    rag_config = {
        "rag": {"generator": "openai"},
        "llm": {"model": model_name, "api_key": api_key, "api_base": llm_base},
    }

    # HyDE: generate hypothetical document
    hyde_prompt = "Write a concise factual document that directly answers: What are the main contributions and key findings of this paper?"
    hyde_messages = [ChatMessage(role="user", content=hyde_prompt)]
    generator = GeneratorManager().resolve(rag_config)
    hyde_doc = await generator.generate(hyde_messages, rag_config)

    # Embed hyde doc locally and retrieve top-k
    hyde_vec = local_embed(hyde_doc, dim=128)
    scored = [(rc, cosine(hyde_vec, vec)) for rc, vec in chunk_records]
    scored.sort(key=lambda t: t[1], reverse=True)
    top_k = int(os.getenv("RAG_TOP_K", "5"))
    top = scored[:top_k]

    context = "\n\n".join(f"[{i+1}] {rc.text[:400]}" for i, (rc, s) in enumerate(top))
    prompt = PROMPT_TEMPLATE.format(context=context, question="What are the main contributions and key findings of this paper?")

    final_messages = [ChatMessage(role="user", content=prompt)]
    answer = await generator.generate(final_messages, rag_config)

    print("\n--- Final Result ---")
    print(f"Chunks used: {len(top)}")
    print("Answer:\n")
    print(answer)


if __name__ == "__main__":
    asyncio.run(main())
