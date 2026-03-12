import asyncio
import os
import sys
from pathlib import Path

# Ensure we can import modules from the app directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import PlatformSettings
from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext
from app.modules.workspaces.setting_manager import WorkspaceSettingManager

async def run_ingestion():
    print("🚀 PIPELINE: INGESTION TEST")
    
    settings = PlatformSettings()
    manager = KaragManager(settings)
    
    tenant = TenantContext(
        organization_id="test-org",
        project_id="test-project",
        workspace_id="test-workspace",
        actor_id="test-user",
    )

    
    ws_setting = WorkspaceSettingManager.build_default(workspace_id=tenant.workspace_id)

    
    pdf_path = Path(__file__).resolve().parents[3] / ".docs" / "1906.05799v4.pdf"
    if not pdf_path.exists():
        print(f"❌ Real data missing at: {pdf_path}")
        return
    
    content = pdf_path.read_bytes()
    print(f"Ingesting real data: {pdf_path.name}...")
    
    docs = await manager.ingest_document(
        tenant=tenant,
        project_id=tenant.project_id,
        workspace_id=tenant.workspace_id,
        filename=pdf_path.name,
        content=content,
        setting=ws_setting,
    )
    
    print(f"✅ Ingestion successful: {len(docs)} document(s)")

if __name__ == "__main__":
    asyncio.run(run_ingestion())
