#!/usr/bin/env python3
"""Ingest and query using Jina embeddings + Jina reranker.

Configures a workspace to use Jina endpoints (api_base=https://api.jina.ai/v1)
and the `dense` embedder (pointing at Jina), `qdrant` vectorstore, and `jina`
reranker. Then ingests `.docs/1906.05799v4.pdf` and runs a sample query.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
import os

from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext
from app.core.rag.types import RagContext
from app.modules.workspaces.setting_manager import WorkspaceSettingManager
from app.modules.workspaces.schemas import WorkspaceSettingUpdate


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    pdf_path = repo_root / ".docs" / "1906.05799v4.pdf"
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    manager = KaragManager.startup()
    manager.database.recreate_schema()

    tenant = TenantContext(
        organization_id="jina-org",
        project_id="jina-project",
        workspace_id="jina-workspace",
        actor_id="jina-user",
        permissions={"doc.upload", "doc.view", "rag.query"},
    )

    jina_api_base = os.getenv("JINA_API_BASE", "https://api.jina.ai/v1")
    jina_key = os.getenv("JINA_AI_API_KEY") or os.getenv("JINA_API_KEY")
    # Use local Qdrant explicitly (QDRANT_URL in .env points to cloud)
    qdrant_url = "http://localhost:6333"

    # Build a workspace setting update that targets Jina for embeddings + rerank
    rerank_base = jina_api_base.rstrip('/') + '/rerank'

    update = WorkspaceSettingUpdate(
        embedding={
            "component": "dense",
            "provider": "jina",
            "model": os.getenv("JINA_EMBEDDING_MODEL", "jina-embeddings-v3"),
            "dimension": int(os.getenv("JINA_EMBEDDING_DIM", "1024")),
            "batch_size": int(os.getenv("JINA_BATCH", "8")),
            "api_key": jina_key,
            "api_base": jina_api_base,
        },
        vectorstore={
            "component": "qdrant",
            "url": qdrant_url,
            "api_key": "",
            "distance_metric": "cosine",
            "index_type": "hnsw",
            "vector_dimension": int(os.getenv("JINA_EMBEDDING_DIM", "1024")),
        },
        retriever={"component": "hybrid", "top_k": 20, "score_threshold": 0.0},
        reranker={
            "component": "jina",
            "provider": "jina",
            "model": os.getenv("JINA_RERANK_MODEL", "jina-reranker-v2-base-multilingual"),
            "api_key": jina_key,
            "api_base": rerank_base,
            "top_k": 5,
        },
        rag={
            "reader": "simple_pdf",
            "query_transformer": "identity",
            "generator": "openai",
            "prompt_template": "Context:\n{{context}}\n\nQuestion:\n{{question}}\n\nAnswer:",
            "max_context_tokens": 4000,
            "context_compression": False,
            "citation_mode": "inline",
            "context_formatting_template": "[{index}] {text}",
        },
        llm={
            "provider": "omniroute",
            "model": os.getenv("DEFAULT_LLM_MODEL", os.getenv("LLM_MODEL", "cost-saver")),
            "temperature": 0.2,
            "max_tokens": 700,
            "streaming": False,
            "api_key": os.getenv("OPENAI_API_KEY"),
            "api_base": os.getenv("LLM_BASE_URL", os.getenv("OPENAI_BASE_URL")),
        },
    )

    # Apply setting: merge update into default setting then upsert
    base = WorkspaceSettingManager.build_default(workspace_id=tenant.workspace_id)
    merged = WorkspaceSettingManager.merge(base, update)
    manager.workspace_settings.upsert(tenant, merged)

    # Debug: verify round-trip
    from app.core.rag.utils import resolve_collection_name
    ingest_collection = resolve_collection_name("default", merged.embedding.model)
    print(f"[DEBUG] Ingestion setting embedding.model = {merged.embedding.model}")
    print(f"[DEBUG] Ingestion collection = {ingest_collection}")

    roundtrip = manager.workspace_settings.get(tenant, tenant.workspace_id)
    if roundtrip:
        query_collection = resolve_collection_name("default", roundtrip.embedding.model)
        print(f"[DEBUG] Roundtrip setting embedding.model = {roundtrip.embedding.model}")
        print(f"[DEBUG] Roundtrip collection = {query_collection}")
        print(f"[DEBUG] Collection match: {ingest_collection == query_collection}")
        print(f"[DEBUG] Roundtrip embedding.api_base = {roundtrip.embedding.api_base}")
        print(f"[DEBUG] Roundtrip embedding.api_key set = {bool(roundtrip.embedding.api_key)}")
        print(f"[DEBUG] Roundtrip reranker = {roundtrip.reranker.component}")
        print(f"[DEBUG] Roundtrip reranker.api_base = {roundtrip.reranker.api_base}")
        print(f"[DEBUG] Roundtrip reranker.top_k = {roundtrip.reranker.top_k}")
        print(f"[DEBUG] Roundtrip retriever.top_k = {roundtrip.retriever.top_k}")
        print(f"[DEBUG] Roundtrip llm.api_base = {roundtrip.llm.api_base}")
        print(f"[DEBUG] Roundtrip llm.model = {roundtrip.llm.model}")
        print(f"[DEBUG] Roundtrip rag.reader = {roundtrip.rag.reader}")
        print(f"[DEBUG] Roundtrip rag.query_transformer = {roundtrip.rag.query_transformer}")
    else:
        print("[DEBUG] Roundtrip: NO SETTING FOUND — will use build_default()")

    # Ingest
    pdf_bytes = pdf_path.read_bytes()

    async def _run():
        # Pass the merged setting explicitly to avoid DB roundtrip issues
        docs = await manager.ingest_document(
            tenant=tenant,
            project_id=tenant.project_id,
            workspace_id=tenant.workspace_id,
            filename=pdf_path.name,
            content=pdf_bytes,
            extension="pdf",
            setting=merged,
        )
        print(f"\nIngested {len(docs)} doc(s)")

        # Direct Qdrant check after ingestion
        from qdrant_client import QdrantClient
        qc = QdrantClient(url=qdrant_url, timeout=10, check_compatibility=False)
        try:
            colls = [c.name for c in qc.get_collections().collections]
            print(f"[DEBUG] Qdrant collections after ingest: {colls}")
            if ingest_collection in colls:
                info = qc.get_collection(ingest_collection)
                print(f"[DEBUG] Collection '{ingest_collection}' points: {info.points_count}, vectors: {info.vectors_count}")
            else:
                print(f"[DEBUG] Collection '{ingest_collection}' NOT FOUND — ingestion did NOT persist to Qdrant!")
        except Exception as e:
            print(f"[DEBUG] Qdrant check error: {e}")

        # Also pass setting explicitly for query
        query_text = "What methods does this paper propose for applying deep reinforcement learning to cyber security? What are the key contributions and proposed approaches?"
        context = RagContext(
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=tenant.workspace_id,
            dataset_id="default",
            collection_name=ingest_collection,
            filters={"workspace_id": tenant.workspace_id},
            top_k=merged.retriever.top_k,
        )

        # ── manual pipeline to debug each stage ──
        rag_config = {}
        # build rag_config from merged setting (same as _setting_to_rag_config)
        from app.core.rag.managers.rag_manager import _setting_to_rag_config
        rag_config = _setting_to_rag_config(merged)

        # 1. Transform
        transformed_query = await manager.rag_manager.query_transformers.process(rag_config, query_text)
        print(f"\n[DEBUG] Transformed query: {transformed_query[:200]}")

        # 2. Embed
        query_embedding = await manager.rag_manager.embedders.embed_query(rag_config, transformed_query)
        print(f"[DEBUG] Query embedding dim: {len(query_embedding.vector)}")

        # 3. Retrieve (vector search BEFORE reranking)
        raw_chunks = await manager.rag_manager.retrievers.process(
            rag_config, query_embedding,
            collection_name=context.collection_name,
            filters=context.filters,
            top_k=context.top_k,
        )
        print(f"\n[DEBUG] Retriever returned {len(raw_chunks)} chunks BEFORE reranking:")
        for i, c in enumerate(raw_chunks):
            is_ref = any(kw in c.text[:80] for kw in ['[1]', '[2]', 'IEEE Trans', 'Conference', 'pp.', 'vol.'])
            tag = " [REF]" if is_ref else " [CONTENT]"
            print(f"  raw[{i}] score={c.score:.4f}{tag} text={c.text[:120]}...")

        # 4. Rerank
        reranked_chunks = await manager.rag_manager.rerankers.process(rag_config, query_text, raw_chunks)
        print(f"\n[DEBUG] Reranker returned {len(reranked_chunks)} chunks:")
        for i, c in enumerate(reranked_chunks):
            is_ref = any(kw in c.text[:80] for kw in ['[1]', '[2]', 'IEEE Trans', 'Conference', 'pp.', 'vol.'])
            tag = " [REF]" if is_ref else " [CONTENT]"
            print(f"  reranked[{i}] score={c.score:.4f}{tag} text={c.text[:120]}...")

        # 5. Build chat context
        messages = manager.rag_manager.chat_context.process(
            rag_config, query=query_text, retrieved_chunks=reranked_chunks, conversation_history=[],
        )
        print(f"\n[DEBUG] Messages count: {len(messages)}")
        if messages:
            sys_msg = messages[0]
            print(f"[DEBUG] System message ({len(sys_msg.content)} chars): {sys_msg.content[:500]}...")

        # 6. Generate
        answer = await manager.rag_manager.generators.process(rag_config, messages)
        print(f"\n--- Answer ---")
        print(answer)

    asyncio.run(_run())


if __name__ == "__main__":
    main()
