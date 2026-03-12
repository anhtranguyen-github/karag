import asyncio
import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

# Setup PYTHONPATH
sys.path.insert(0, str(Path(__file__).parents[3]))

import os
# Force SQLite for test purity
os.environ["DATABASE_URL"] = "sqlite:///tests/pipeline_observability/test.db"
os.environ["REDIS_URL"] = ""

from app.core.config import PlatformSettings
from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext
from app.modules.workspaces.setting_manager import WorkspaceSettingManager
from app.rag.schemas.types import RagContext
from app.rag.schemas.pipeline_models import QueryAnalysis, RetrievalSet, RefinedContext

from tests.pipeline_observability.scripts.trace_lib import TraceLogger

async def run_scenario(scenario: dict, manager: KaragManager, tenant: TenantContext):
    print(f"\n🚀 Running Scenario: {scenario['name']} ({scenario['id']})")
    
    # 0. Setup
    workspace_id = tenant.workspace_id
    ws_setting = WorkspaceSettingManager.build_default(workspace_id=workspace_id)
    # Apply overrides
    overrides = scenario.get("config_overrides", {})
    if "rag" in overrides:
        for k, v in overrides["rag"].items():
            setattr(ws_setting.rag, k, v)
            
    rag_config = ws_setting.model_dump(mode="python")
    context = RagContext(
        organization_id=tenant.organization_id,
        project_id=tenant.project_id,
        workspace_id=workspace_id,
        collection_name=scenario.get("collection_name", "test_collection"),
        filters={"workspace_id": workspace_id},
        top_k=ws_setting.retriever.top_k,
    )

    
    query = scenario["query"]
    logger = TraceLogger(scenario["name"], query)
    pipeline = manager.rag_manager.pipeline
    
    # --- PHASE 1: PRE-RETRIEVAL ---
    print("  [1/4] Pre-Retrieval...")
    s1 = time.perf_counter()
    analysis = await pipeline.pre_retrieval.analyze(query, rag_config, [])
    logger.capture(
        stage="Pre-Retrieval",
        component="Pre-Retrieval Manager",
        cls_name="PreRetrievalManager",
        input_val=query,
        output_val=analysis.model_dump(),
        start_time=s1,
        metadata={"num_expanded": len(analysis.expanded_queries), "filters": analysis.filters}
    )
    
    # --- PHASE 2: RETRIEVAL ---
    print("  [2/4] Retrieval...")
    s2 = time.perf_counter()
    retrieval_set = await pipeline.retrieval.retrieve(analysis, rag_config, context)
    logger.capture(
        stage="Retrieval",
        component="Retrieval Manager",
        cls_name="RetrievalManager",
        input_val=analysis.model_dump(),
        output_val={"candidates_count": len(retrieval_set.candidates)}, # Chunks might be too big
        start_time=s2,
        metadata={"search_count": retrieval_set.metadata.get("search_count")}
    )
    
    # --- PHASE 3: POST-RETRIEVAL ---
    print("  [3/4] Post-Retrieval...")
    s3 = time.perf_counter()
    refined = await pipeline.post_retrieval.refine(retrieval_set, rag_config)
    logger.capture(
        stage="Post-Retrieval",
        component="Post-Retrieval Manager",
        cls_name="PostRetrievalManager",
        input_val={"candidates_in": len(retrieval_set.candidates)},
        output_val={"ranked_count": len(refined.ranked_chunks), "pii_spans": len(refined.masked_spans)},
        start_time=s3,
        metadata={"masked_spans": [s.model_dump() for s in refined.masked_spans]}
    )
    
    # --- PHASE 4: INFERENCE ---
    print("  [4/4] Inference...")
    s4 = time.perf_counter()
    messages = manager.rag_manager.chat_context.process(
        rag_config, query=query, retrieved_chunks=refined.ranked_chunks, conversation_history=[]
    )
    answer = await manager.rag_manager.inference.process(rag_config, messages)
    logger.capture(
        stage="Inference",
        component="Inference/Context Manager",
        cls_name="InferenceManager",
        input_val={"prompt_preview": messages[-1].content[:100]},
        output_val={"answer_preview": answer[:100]},
        start_time=s4,
        metadata={"context_count": len(refined.ranked_chunks)}
    )
    
    trace_obj = logger.finalize(answer)
    
    # 5. Save Report
    report_path = f"tests/pipeline_observability/reports/retrieval/res_{scenario['id']}.json"
    trace_obj.save(report_path)
    print(f"✅ Finished in {trace_obj.total_latency_ms}ms. Report saved to {report_path}")
    
    # Generate human-readable summary
    md_path = report_path.replace(".json", ".md")
    with open(md_path, "w") as f:
        f.write(f"# Pipeline Trace: {scenario['name']}\n\n")
        f.write(f"**Scenario ID:** {scenario['id']}\n")
        f.write(f"**Query:** `{query}`\n")
        f.write(f"**Total Latency:** {trace_obj.total_latency_ms}ms\n\n")
        f.write("## Execution Steps\n\n")
        for step in trace_obj.steps:
            f.write(f"### {step.stage}: {step.component_name}\n")
            f.write(f"- **Class:** `{step.class_name}`\n")
            f.write(f"- **Latency:** {step.latency_ms}ms\n")
            f.write(f"- **Outcome:** {step.metadata}\n")
            f.write("\n")
        f.write(f"\n## Final Answer\n\n{answer}\n")

async def main():
    manager = KaragManager(PlatformSettings())
    tenant = TenantContext(
        organization_id="obs-org", project_id="obs-proj",
        workspace_id="obs-work", actor_id="obs-user"
    )
    
    scenario_file = "tests/pipeline_observability/scenarios/retrieval/transformer_queries.json"
    with open(scenario_file, "r") as f:
        scenarios = json.load(f)
        
    for scene in scenarios:
        if scene["id"] != "q_001": # Focus on others
             print(f"DEBUG: Starting {scene['id']}...")
             try:
                 await run_scenario(scene, manager, tenant)
             except Exception as e:
                 print(f"FAILED {scene['id']}: {e}")
                 import traceback
                 traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
