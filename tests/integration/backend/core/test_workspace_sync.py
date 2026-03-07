from unittest.mock import AsyncMock, MagicMock

import pytest
from src.backend.app.services.workspace_service import workspace_service


@pytest.fixture
def mock_db(mocker):
    mock_db = MagicMock()
    mock_col = MagicMock()

    mock_col.delete_one = AsyncMock()
    mock_col.delete_many = AsyncMock()

    mock_db.__getitem__.return_value = mock_col
    mock_db.workspaces = mock_col
    mock_db.workspace_settings = mock_col
    mock_db.thread_metadata = mock_col

    mocker.patch(
        "src.backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )
    return mock_db, mock_col


@pytest.mark.asyncio
async def test_workspace_delete_triggers_sync(mocker, mock_db):
    _, mock_col = mock_db

    # Mock document_service to avoid real DB/Qdrant calls
    # Target the source instance as it is imported locally in WorkspaceService
    mock_doc_service = mocker.patch("src.backend.app.services.document_service.document_service")
    mock_doc_service.delete_many = AsyncMock()
    mock_doc_service.sync_workspaces = AsyncMock()

    await workspace_service.delete("test-ws")

    # 1. Check metadata cleanup (multiple collections are cleaned)
    mock_col.delete_one.assert_any_call({"id": "test-ws"})
    mock_col.delete_one.assert_any_call({"workspace_id": "test-ws"})

    # 2. Check sync trigger
    mock_doc_service.sync_workspaces.assert_called_once()
