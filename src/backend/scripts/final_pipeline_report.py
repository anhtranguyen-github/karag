import asyncio
import json
import os
import sys
import time
from pathlib import Path

# Setup PYTHONPATH
sys.path.insert(0, str(Path(__file__).parents[1]))
print(">>> [INIT] FINAL REPORT STARTING")
os.environ["DATABASE_URL"] = "sqlite:///backend_report.db"
os.environ["REDIS_URL"] = ""

from app.core.config import PlatformSettings

from app.rag.rag_manager import RagManager
from app.core.tenancy import TenantContext
from app.modules.workspaces.setting_manager import WorkspaceSettingManager
from app.rag.schemas.types import RagContext, FileStatus
from app.rag.schemas.schemas import FileConfig

async def process_doc(file_path: Path, manager: RagManager, tenant: TenantContext):
    print(f"\n--- Processing: {file_path.name} ---")
    content = file_path.read_bytes()
    workspace_id = tenant.workspace_id
    ws_setting = WorkspaceSettingManager.build_default(workspace_id=workspace_id)
    rag_config = ws_setting.model_dump(mode="python")
    
    # 1. Read
    from app.rag.schemas.schemas import FileConfig
    cfg = FileConfig(
        fileID=file_path.stem,
        storage_path=f"test/{file_path.name}",
        project_id=tenant.project_id,
        organization_id=tenant.organization_id,
        filename=file_path.name,
        extension=file_path.suffix,
        file_size=len(content),
        source="manual",
        status=FileStatus.PENDING
    )
    docs = await manager.readers.process(rag_config, cfg, content)
    print(f"  [Read] Chars: {len(docs[0].content)}")
    
    # 2. Chunk & Embed & Persist
    context_meta = {"workspace_id": workspace_id, "project_id": tenant.project_id, "organization_id": tenant.organization_id}
    rag_ctx = RagContext(**context_meta, collection_name="any", dataset_id="any")
    rag_docs = [manager._to_rag_document(d, rag_ctx) for d in docs]
    
    rag_docs = await manager.chunkers.process(rag_config, rag_docs)
    total_chunks = sum(len(d.chunks) for d in rag_docs)
    print(f"  [Chunk] Chunks: {total_chunks}")
    
    rag_docs = await manager.embedders.process(rag_config, rag_docs)
    print(f"  [Embed] Completed.")
    
    coll_name = f"final_obs_{file_path.stem}"
    await manager.vectorstores.persist(rag_config, rag_docs, coll_name, context_meta)
    print(f"  [Persist] Done: {coll_name}")
    
    # 3. Test Query
    query = "Tóm tắt nội dung chính của tài liệu này." # Default Vietnamese summary query
    if "Transformer" in file_path.name or "Attention" in file_path.name:
        query = "What is the core architecture of the Transformer?"
        
    print(f"  [Query] Probing: {query}")
    query_result = await manager.pipeline.process(
        query=query,
        rag_config=rag_config,
        tenant=tenant,
        context=RagContext(**context_meta, collection_name=coll_name, top_k=3)
    )
    print(f"  [Result] Answer found.")
    return {
        "doc": file_path.name,
        "chunks": total_chunks,
        "collection": coll_name,
        "answer_preview": query_result.answer[:100] + "..."
    }

async def main():
    manager = RagManager(PlatformSettings())
    tenant = TenantContext(
        organization_id="org",
        project_id="proj",
        workspace_id="work",
        actor_id="user"
    )

    docs_dir = Path("/home/tra01/project/karag/.docs")
    results = []
    for pdf in docs_dir.glob("*.pdf"):
        if "Supervised" not in pdf.name: 
            continue
        try:
            res = await process_doc(pdf, manager, tenant)
            results.append(res)

        except Exception as e:
            print(f"Failed {pdf.name}: {e}")
            
    # Final Report
    print("\n\n" + "="*50)
    print("FINAL PIPELINE REPORT")
    print("="*50)
    for r in results:
        print(f"Doc: {r['doc']}")
        print(f"  Chunks: {r['chunks']}")
        print(f"  Coll: {r['collection']}")
        print(f"  Sample: {r['answer_preview']}")
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(main())
