import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.app.services.document_service import document_service


def get_mock_db():
    mock_db = MagicMock()
    mock_col = MagicMock()
    mock_col.find_one = AsyncMock(return_value=None)
    mock_col.insert_one = AsyncMock()
    mock_col.update_one = AsyncMock()
    mock_db.__getitem__.return_value = mock_col
    mock_db.documents = mock_col
    return mock_db, mock_col


@pytest.mark.asyncio
async def test_link_document_starts_as_indexing(mocker):
    """Test that linking a document to a workspace sets its status to 'indexing'."""
    mock_db, mock_col = get_mock_db()
    mocker.patch(
        "backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )

    # Mocking task service
    mocker.patch(
        "backend.app.services.task.task_service.task_service.is_cancelled",
        new=AsyncMock(return_value=False),
    )

    # Existing doc in vault
    doc_id = "doc-123"
    mock_doc = {
        "id": doc_id,
        "workspace_id": "vault",
        "filename": "test.pdf",
        "content_hash": "hash-abc",
        "minio_path": "vault/test.pdf",
        "chunks": 10,  # Legacy chunks from vault (should be ignored)
    }
    # First call find_one returns the doc, second (check exists) returns None
    mock_col.find_one.side_effect = [mock_doc, None]

    # Mock settings and ingestion
    mocker.patch(
        "backend.app.core.settings_manager.settings_manager.get_settings",
        new=AsyncMock(return_value=MagicMock()),
    )
    mock_ingestion = mocker.patch(
        "backend.app.services.document.document_ingestion_service.document_ingestion_service.index_document",
        new=AsyncMock(return_value=5),
    )

    await document_service.update_workspaces(
        doc_id=doc_id, target_workspace_id="new-workspace", action="link"
    )

    # Verify new doc creation
    assert mock_col.insert_one.call_count == 1
    new_doc = mock_col.insert_one.call_args[0][0]

    assert new_doc["workspace_id"] == "new-workspace"
    assert new_doc["status"] == "indexing"  # Should be 'indexing' per user request
    assert new_doc["chunks"] == 0  # Should start at 0
    assert new_doc["workspace_statuses"]["new-workspace"] == "indexing"

    # Verify ingestion was triggered for the new link
    mock_ingestion.assert_called_once()
