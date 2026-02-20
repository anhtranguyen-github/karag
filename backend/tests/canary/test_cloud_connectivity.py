import pytest
from backend.app.rag.qdrant_provider import qdrant
from backend.app.core.mongodb import mongodb_manager

@pytest.mark.canary
@pytest.mark.asyncio
async def test_qdrant_cloud_connectivity():
    """Verify that we can reach Qdrant Cloud."""
    info = await qdrant.get_system_info()
    assert "error" not in info
    assert "collections" in info

@pytest.mark.canary
@pytest.mark.asyncio
async def test_mongodb_atlas_connectivity():
    """Verify that we can reach MongoDB Atlas."""
    db = mongodb_manager.get_async_database()
    # Simple timeout-based check
    try:
        await db.command("ping")
        connected = True
    except Exception:
        connected = False
    assert connected is True
