#!/usr/bin/env python3
"""Run full ingestion -> retrieval -> generation using explicit WorkspaceSetting.

This script builds a WorkspaceSetting populated from environment variables
so embedder and generator have `api_base` and `api_key` set (OmniRoute).
It ingests `.docs/1906.05799v4.pdf` and runs a retrieval query.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
import os
from pathlib import Path

from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext
from app.modules.workspaces.setting_manager import WorkspaceSettingManager


async def main():
    settings = None
    # PlatformSettings will read .env
    from app.core.config import PlatformSettings
    settings = PlatformSettings()

    manager = KaragManager(settings)

    # Build default setting and override embedder/llm/vectorstore to use env vars
    ws_setting = WorkspaceSettingManager.build_default(workspace_id="test-workspace-e2e")

    # Populate embedding/llm/vectorstore API endpoints and keys from env
    llm_base = os.getenv("LLM_BASE_URL") or os.getenv("OPENAI_BASE_URL") or ""
    openai_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_KEY") or None
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    qdrant_key = os.getenv("QDRANT_API_KEY") or None

    ws_setting.embedding.api_base = llm_base
    ws_setting.embedding.api_key = openai_key
    ws_setting.embedding.model = os.getenv("EMBEDDING_MODEL", ws_setting.embedding.model)
    ws_setting.embedding.dimension = int(os.getenv("EMBEDDING_DIMENSION", ws_setting.embedding.dimension or 1536))

    ws_setting.llm.api_base = llm_base
    ws_setting.llm.api_key = openai_key
    ws_setting.llm.model = os.getenv("LLM_MODEL", ws_setting.llm.model)

    ws_setting.vectorstore.url = qdrant_url
    ws_setting.vectorstore.api_key = qdrant_key

    tenant = TenantContext(
        organization_id="test-org",
        project_id="test-project",
        workspace_id="test-workspace-e2e",
        actor_id="test-user-e2e",
        permissions={"doc.upload", "doc.view", "rag.query"},
    )

    pdf_path = Path(__file__).resolve().parents[3] / ".docs" / "1906.05799v4.pdf"
    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}")
        raise SystemExit(1)

    content = pdf_path.read_bytes()

    print(f"Ingesting {pdf_path.name} using embedding api_base={ws_setting.embedding.api_base}")
    docs = await manager.ingest_document(
        tenant=tenant,
        project_id=tenant.project_id,
        workspace_id=tenant.workspace_id,
        filename=pdf_path.name,
        content=content,
        setting=ws_setting,
    )
    print(f"Ingested {len(docs)} document(s)")

    query = "What are the main contributions of the paper?"
    print("Running retrieval...")
    result = await manager.execute_rag_query(tenant=tenant, workspace_id=tenant.workspace_id, query=query, dataset_id="default")
    print("--- Result ---")
    print(f"Answer: {result.answer}\nChunks returned: {len(result.chunks)}")


if __name__ == "__main__":
    asyncio.run(main())
