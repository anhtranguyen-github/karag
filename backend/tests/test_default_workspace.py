import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.mongodb import mongodb_manager

# Force motor to recreate client if loop changes
def reset_mongo():
    mongodb_manager._async_client = None

@pytest.fixture(autouse=True)
def setup_teardown():
    reset_mongo()
    yield

@pytest.mark.asyncio
async def test_default_workspace_exists():
    """Verify that the default workspace is created automatically and returned in the list."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Manually ensure for the test if lifespan doesnt trigger
        from backend.app.services.workspace_service import workspace_service
        await workspace_service.ensure_default_workspace()
        
        res = await ac.get("/workspaces/")
        assert res.status_code == 200
        body = res.json()
        workspaces = body["data"]
        assert any(ws["id"] == "default" for ws in workspaces)
        
        default_ws = next(ws for ws in workspaces if ws["id"] == "default")
        assert "Default" in default_ws["name"]

@pytest.mark.asyncio
async def test_default_workspace_protection():
    """Verify that the default workspace cannot be updated or deleted."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        from backend.app.services.workspace_service import workspace_service
        await workspace_service.ensure_default_workspace()
        
        # Try to update
        res = await ac.patch("/workspaces/default", json={"name": "Hacked name"})
        assert res.status_code == 400
        assert "cannot be edited" in res.json()["message"]
        
        # Try to delete
        res = await ac.delete("/workspaces/default")
        assert res.status_code == 400
        assert "Cannot delete default workspace" in res.json()["message"]

@pytest.mark.asyncio
async def test_default_settings_fallback():
    """Verify that settings fallback to default/global if not set for workspace."""
    from backend.app.core.settings_manager import settings_manager
    
    # Get settings for a non-existent workspace
    bogus_ws_id = f"none_{uuid.uuid4().hex[:6]}"
    settings = await settings_manager.get_settings(bogus_ws_id)
    
    # Should match global settings
    global_s = settings_manager.get_global_settings()
    assert settings.llm_model == global_s.llm_model
    assert settings.embedding_provider == global_s.embedding_provider
