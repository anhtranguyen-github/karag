import asyncio
import os
import sys
import time
from pathlib import Path

# Ensure we can import modules from the app directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import PlatformSettings
from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext
from app.modules.workspaces.setting_manager import WorkspaceSettingManager

async def run_e2e_pipeline():
    print("\n" + "="*50)
    print("🚀 PIPELINE E2E: ADVANCED MULTI-STAGE CASCADE")
    print("   [Marker + Semantic + Jina Multi-Vector + HyDE + Qdrant]")
    print("="*50)
    
    # 0. Initialize System
    settings = PlatformSettings()
    manager = KaragManager(settings)
    
    tenant = TenantContext(
        organization_id="e2e-org",
        project_id="e2e-project",
        workspace_id="e2e-workspace",
        actor_id="e2e-user",
    )
    workspace_id = tenant.workspace_id
    
    # Defaults are now set in WorkspaceSettingManager and PlatformSettings
    ws_setting = WorkspaceSettingManager.build_default(workspace_id=workspace_id)
    
    print(f"Stack Configured:")
    print(f" - Embedding: {ws_setting.embedding.provider} | {ws_setting.embedding.model}")
    print(f" - Reranker:  {ws_setting.reranker.provider}  | {ws_setting.reranker.model}")
    print(f" - Vectorstore: {ws_setting.vectorstore.component}")
    print(f" - Generator: {ws_setting.llm.provider} | {ws_setting.llm.model}")
    
    # 1. PHASE 1: INGESTION
    print("\n📦 [PHASE 1] INGESTION")
    pdf_path = Path(__file__).resolve().parents[3] / ".docs" / "1906.05799v4.pdf"
    if not pdf_path.exists():
        print(f"❌ Real data missing at: {pdf_path}")
        return
    
    start_time = time.perf_counter()
    content = pdf_path.read_bytes()
    print(f"Processing real data: {pdf_path.name} ({len(content) / 1e6:.2f} MB)")
    
    docs = await manager.ingest_document(
        tenant=tenant,
        project_id=tenant.project_id,
        workspace_id=workspace_id,
        filename=pdf_path.name,
        content=content,
        setting=ws_setting,
    )
    elapsed = time.perf_counter() - start_time
    print(f"✅ Ingested successfully in {elapsed:.2f}s")
    
    # 2. PHASE 2: RETRIEVAL
    print("\n🔍 [PHASE 2] RETRIEVAL")
    query = "What is the core contribution of this paper?"
    print(f"Query: '{query}'")
    
    start_time = time.perf_counter()
    result = await manager.execute_rag_query(
        tenant=tenant,
        workspace_id=workspace_id,
        query=query,
        dataset_id="default"
    )
    elapsed = time.perf_counter() - start_time
    
    print(f"✅ Retrieved {len(result.chunks)} segments in {elapsed:.2f}s")
    
    # 3. PHASE 3: GENERATION
    print("\n🤖 [PHASE 3] GENERATION")
    if result.answer:
        print("\n📝 FINAL OUTPUT:")
        print("-" * 50)
        print(result.answer)
        print("-" * 50)
    else:
        print("❌ Generation produced no output.")
        
    print("\n✨ Focused Pipeline E2E Complete.")

if __name__ == "__main__":
    asyncio.run(run_e2e_pipeline())
