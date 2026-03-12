import asyncio
import os
import sys

# Ensure we can import modules from the app directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import PlatformSettings
from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext
from app.modules.workspaces.setting_manager import WorkspaceSettingManager
from app.rag.schemas.types import RagContext, RetrievedChunk

async def run_inference():
    print("🚀 PIPELINE: INFERENCE TEST (Advanced Cascade)")
    
    settings = PlatformSettings()
    manager = KaragManager(settings)
    
    tenant = TenantContext(
        organization_id="test-org",
        project_id="test-project",
        workspace_id="test-workspace",
        actor_id="test-user",
    )

    workspace_id = tenant.workspace_id
    
    ws_setting = WorkspaceSettingManager.build_default(workspace_id=workspace_id)
    ws_setting.llm.api_base = "http://127.0.0.1:20128/v1"
    ws_setting.llm.model = "cost-saver"
    
    query = "What is the transformer architecture?"
    
    doc_id = f"test-doc-{workspace_id}"
    context_chunks = [
        RetrievedChunk(chunk_id="c1", document_id=doc_id, document_title="Attention is All You Need", text="Transformers use self-attention mechanism to weight the significance of each part of the input data.", score=0.95),
        RetrievedChunk(chunk_id="c2", document_id=doc_id, document_title="Deep Learning Guide", text="The architecture was introduced in 'Attention Is All You Need' in 2017.", score=0.92),
    ]
    
    print(f"Running Inference for query: '{query}'")
    print(f"Assembling context from {len(context_chunks)} chunks...")
    
    # 1. Pipeline Stage: Context & Prompt Assembly
    messages = manager.rag_manager.chat_context.process(
        ws_setting.model_dump(mode="python"),
        query=query,
        retrieved_chunks=context_chunks,
        conversation_history=[],
    )
    
    print("System Prompt snippet (Provenance Check):")
    print("-" * 20)
    print(messages[0].content[:200] + "...")
    print("-" * 20)
    
    # 2. Pipeline Stage: Inference Engine
    print(f"Inferring via OMNI (model={ws_setting.llm.model})...")
    answer = await manager.rag_manager.inference.process(
        ws_setting.model_dump(mode="python"), 
        messages
    )
    
    print(f"\n✅ Safe Inference Answer:\n{answer}\n")

if __name__ == "__main__":
    asyncio.run(run_inference())
