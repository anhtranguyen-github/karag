import asyncio
import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

# Setup PYTHONPATH
sys.path.insert(0, str(Path(__file__).parents[3]))
print(">>> [INIT] SCRIPT STARTING")
os.environ["DATABASE_URL"] = "sqlite:///tests/pipeline_observability/test.db"
os.environ["REDIS_URL"] = ""

from app.core.config import PlatformSettings
print(">>> [INIT] CONFIG IMPORTED")
from app.rag.rag_manager import RagManager
print(">>> [INIT] RAG MANAGER IMPORTED")
from app.core.tenancy import TenantContext
from app.modules.workspaces.setting_manager import WorkspaceSettingManager
from app.rag.schemas.types import RagContext, FileStatus
from tests.pipeline_observability.scripts.trace_lib import TraceLogger
print(">>> [INIT] ALL IMPORTS COMPLETED")

async def run_ingest_scenario(scenario: dict, manager: RagManager, tenant: TenantContext):
    print(f"\n📦 [OBSERVE] Ingestion Scenario: {scenario['name']} ({scenario['id']})")
    
    workspace_id = tenant.workspace_id
    ws_setting = WorkspaceSettingManager.build_default(workspace_id=workspace_id)
    overrides = scenario.get("config_overrides", {})
    if "embedding" in overrides:
        for k, v in overrides["embedding"].items(): setattr(ws_setting.embedding, k, v)
    if "chunking" in overrides:
        for k, v in overrides["chunking"].items(): setattr(ws_setting.chunking, k, v)
    if "rag" in overrides:
        for k, v in overrides["rag"].items(): setattr(ws_setting.rag, k, v)
            
    rag_config = ws_setting.model_dump(mode="python")
    
    file_path = Path("/home/tra01/project/karag/.docs") / Path(scenario["file_path"]).name
    if not file_path.exists():
        print(f"  ❌ File missing: {file_path}")
        return
        
    content = file_path.read_bytes()
    logger = TraceLogger(scenario["name"], file_path.name)
    
    # --- PHASE 1: READING ---
    print(f"  [1/4] Reading (Component: {ws_setting.rag.reader})...")
    r_start = time.perf_counter()
    from app.rag.schemas.schemas import FileConfig
    file_config = FileConfig(
        fileID=scenario["id"],
        storage_path=f"obs/{scenario['id']}",
        project_id=tenant.project_id,
        organization_id=tenant.organization_id,
        filename=file_path.name,
        extension=file_path.suffix,
        file_size=len(content),
        source="obs",
        status=FileStatus.PENDING
    )
    docs = await manager.readers.process(rag_config, file_config, content)
    
    # Schema Conversion
    context_meta = {
        "workspace_id": workspace_id, 
        "project_id": tenant.project_id,
        "organization_id": tenant.organization_id
    }
    rag_ctx = RagContext(**context_meta, collection_name="any", dataset_id="any")
    rag_docs = [manager._to_rag_document(d, rag_ctx) for d in docs]
    
    logger.capture(
        stage="Reading", component="Reader Manager", cls_name="ReaderManager",
        input_val=file_path.name, output_val={"chars": len(docs[0].content)},
        start_time=r_start, metadata={"reader": ws_setting.rag.reader}
    )
    
    # --- PHASE 2: CHUNKING ---
    print(f"  [2/4] Chunking (Component: {ws_setting.chunking.component})...")
    c_start = time.perf_counter()
    rag_docs = await manager.chunkers.process(rag_config, rag_docs)
    total_chunks = sum(len(d.chunks) for d in rag_docs)
    logger.capture(
        stage="Chunking", component="Chunker Manager", cls_name="ChunkerManager",
        input_val={"num_docs": len(rag_docs)}, output_val={"num_chunks": total_chunks},
        start_time=c_start, metadata={"component": ws_setting.chunking.component}
    )
    
    # --- PHASE 3: EMBEDDING ---
    print(f"  [3/4] Embedding (Component: {ws_setting.embedding.component})...")
    e_start = time.perf_counter()
    rag_docs = await manager.embedders.process(rag_config, rag_docs)
    logger.capture(
        stage="Embedding", component="Embedder Manager", cls_name="EmbedderManager",
        input_val={"num_chunks": total_chunks}, output_val="Success",
        start_time=e_start, metadata={"model": ws_setting.embedding.model}
    )
    
    # --- PHASE 4: PERSISTENCE ---
    print(f"  [4/4] Persistence (Store: {ws_setting.vectorstore.component})...")
    p_start = time.perf_counter()
    collection_name = f"obs_coll_{scenario['id']}"
    await manager.vectorstores.persist(rag_config, rag_docs, collection_name, context_meta)
    
    logger.capture(
        stage="Persistence", component="VectorStore Manager", cls_name="VectorStoreManager",
        input_val={"collection": collection_name}, output_val="Success",
        start_time=p_start, metadata={"store": ws_setting.vectorstore.component}
    )
    
    trace_obj = logger.finalize(f"Ingested {total_chunks} chunks")
    
    # Save Report
    report_path = f"tests/pipeline_observability/reports/ingestion/res_{scenario['id']}.json"
    trace_obj.save(report_path)
    
    md_path = report_path.replace(".json", ".md")
    with open(md_path, "w") as f:
        f.write(f"# Ingestion Trace: {scenario['name']}\n\n")
        f.write(f"**Source:** {file_path.name}\n")
        f.write(f"**Total Latency:** {trace_obj.total_latency_ms}ms\n")
        f.write(f"**Final Collection:** `{collection_name}`\n\n")
        f.write("## Component Breakdown\n\n")
        for step in trace_obj.steps:
            f.write(f"### {step.stage}: {step.component_name}\n")
            f.write(f"- **Class:** `{step.class_name}`\n")
            f.write(f"- **Outcome:** {step.output_data}\n")
            f.write(f"- **Latency:** {step.latency_ms}ms\n\n")
            if step.metadata:
                f.write(f"  - **Meta:** `{step.metadata}`\n")

    print(f"✅ Report saved: {md_path}")
    return collection_name 

async def main():
    print("DEBUG: INGESTION PROCESS STARTING...")
    rag_manager = RagManager(PlatformSettings())
    print(">>> [INIT] MANAGER INSTANTIATED")

    tenant = TenantContext(
        organization_id="obs-org", project_id="obs-proj",
        workspace_id="obs-work", actor_id="obs-user"
    )
    
    scenario_file = "tests/pipeline_observability/scenarios/ingestion/research_papers.json"
    with open(scenario_file, "r") as f:
        scenarios = json.load(f)
        
    for scene in scenarios:
        try:
            await run_ingest_scenario(scene, rag_manager, tenant)
        except Exception as e:
            print(f"❌ Ingestion Scenario {scene['id']} failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
