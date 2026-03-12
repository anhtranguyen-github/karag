import asyncio
import os
import sys
import json

# Ensure we can import modules from the app directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import PlatformSettings
from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext
from app.modules.workspaces.setting_manager import WorkspaceSettingManager
from app.rag.schemas.types import RagContext
from app.rag.utils.utils import resolve_collection_name

async def run_retrieval():
    print("🚀 PIPELINE: RETRIEVAL TEST")
    
    settings = PlatformSettings()
    manager = KaragManager(settings)
    
    # Needs to match what we ingested!
    tenant = TenantContext(
        organization_id="test-org",
        project_id="test-project",
        workspace_id="test-workspace",
        actor_id="test-user",
    )

    workspace_id = tenant.workspace_id
    
    ws_setting = WorkspaceSettingManager.build_default(workspace_id=workspace_id)

    
    query = "Core contributions Transformers"
    print(f"Querying for: '{query}'")
    
    context = RagContext(
        organization_id=tenant.organization_id,
        project_id=tenant.project_id,
        workspace_id=workspace_id,
        dataset_id="default",
        collection_name=resolve_collection_name("default", ws_setting.embedding.model),
        filters={"workspace_id": workspace_id},
        top_k=ws_setting.retriever.top_k,
    )
    
    # We use rag_manager to isolate retrieval
    # Step 1: Embed
    query_embedding = await manager.rag_manager.embedders.embed_query(
        ws_setting.model_dump(mode="python"), 
        query
    )
    query_embedding.metadata.setdefault("query_text", query)
    
    # Step 2: Retrieve
    chunks = await manager.rag_manager.retrievers.process(
        ws_setting.model_dump(mode="python"),
        query_embedding,
        collection_name=context.collection_name,
        filters=context.filters,
        top_k=context.top_k,
    )
    
    print(f"✅ Retrieved {len(chunks)} chunks.")
    if chunks:
        for i, chunk in enumerate(chunks[:3]):
             print(f"   [{i+1}] {chunk.text[:100]}...")

    else:
        print("❌ No chunks found. (Did you run ingestion first?)")

if __name__ == "__main__":
    asyncio.run(run_retrieval())
