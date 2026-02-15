import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from unittest.mock import AsyncMock, MagicMock
from backend.app.core.mongodb import mongodb_manager

def get_mock_db():
    mock_db = MagicMock()
    
    def create_mock_col():
        mock_col = MagicMock()
        mock_col.find_one = AsyncMock(return_value=None)
        mock_col.insert_one = AsyncMock()
        mock_col.update_one = AsyncMock()
        mock_col.delete_one = AsyncMock()
        mock_col.delete_many = AsyncMock()
        mock_col.find_one_and_update = AsyncMock()
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[])
        mock_col.find.return_value = mock_cursor
        return mock_col

    cols = {
        "workspaces": create_mock_col(),
        "documents": create_mock_col(),
        "thread_metadata": create_mock_col(),
        "workspace_settings": create_mock_col()
    }
    
    mock_db.__getitem__.side_effect = lambda x: cols.get(x, MagicMock())
    mock_db.workspaces = cols["workspaces"]
    mock_db.documents = cols["documents"]
    mock_db.thread_metadata = cols["thread_metadata"]
    mock_db.workspace_settings = cols["workspace_settings"]
    
    return mock_db, cols

@pytest.fixture(autouse=True)
def setup_teardown():
    mongodb_manager._async_client = None
    yield

@pytest.mark.asyncio
async def test_default_workspace_is_now_customizable(mocker):
    """Verify that the 'default' workspace can now be edited and deleted."""
    mock_db, cols = get_mock_db()
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    
    from backend.app.services.workspace_service import workspace_service
    
    # Update should NOT raise ValidationError for 'default' anymore
    await workspace_service.update("default", {"description": "Updated description"})
    cols["workspaces"].find_one_and_update.assert_called_once()
    
    # Delete should NOT raise ValueError for 'default' anymore
    # Mocking document_service.delete_many to avoid complex side effects
    mocker.patch("backend.app.services.document_service.document_service.delete_many", new_callable=AsyncMock)
    await workspace_service.delete("default")
    cols["workspaces"].delete_one.assert_called_with({"id": "default"})

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
