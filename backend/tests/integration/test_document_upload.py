import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.app.services.document_service import document_service
from backend.app.services.task.task_service import task_service

def get_mock_db():
    mock_db = MagicMock()
    mock_col = MagicMock()
    
    # Default async methods
    mock_col.find_one = AsyncMock(return_value=None)
    mock_col.insert_one = AsyncMock()
    mock_col.update_one = AsyncMock()
    mock_col.delete_one = AsyncMock()
    mock_col.delete_many = AsyncMock()
    
    # Allow both db.coll and db["coll"]
    mock_db.__getitem__.return_value = mock_col
    mock_db.documents = mock_col
    
    return mock_db, mock_col

@pytest.mark.asyncio
async def test_upload_to_vault_skip_indexing(mocker):
    """Test that uploading to 'vault' skips neural indexing."""
    mock_db, mock_col = get_mock_db()
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    
    # Mocking Task Service
    mocker.patch("backend.app.services.task.task_service.task_service.update_task", new=AsyncMock())
    mocker.patch("backend.app.services.task.task_service.task_service.is_cancelled", new=AsyncMock(return_value=False))
    
    # Mocking MinIO
    mocker.patch("backend.app.core.minio.MinioManager.upload_file", new=AsyncMock())
    
    # Mocking Document Ingestion Service to ensure it's NOT called for vault
    mock_ingestion = mocker.patch("backend.app.services.document.document_ingestion_service.document_ingestion_service.index_document", new=AsyncMock())

    # Create dummy file content
    content = b"test document content"
    
    # Execute run_ingestion background task (which handles the vault logic)
    await document_service.run_ingestion(
        task_id="task-123",
        safe_filename="test.pdf",
        content=content,
        content_type="application/pdf",
        workspace_id="vault"
    )
    
    # Verify DB state
    # First insert_one, then update_one for verification/uploading, then final status update
    assert mock_col.insert_one.call_count == 1
    
    # Check that status was set to 'uploaded' (reverted from 'stored' based on user request)
    # We need to check the last update_one call
    last_update_call = mock_col.update_one.call_args_list[-1]
    update_data = last_update_call[0][1]["$set"]
    assert update_data["status"] == "uploaded"
    assert "workspace_statuses.vault" in update_data
    assert update_data["workspace_statuses.vault"] == "uploaded"
    
    # Verify ingestion service was NEVER called
    mock_ingestion.assert_not_called()

@pytest.mark.asyncio
async def test_upload_to_workspace_auto_indexes(mocker):
    """Test that uploading to a real workspace triggers neural indexing."""
    mock_db, mock_col = get_mock_db()
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    
    mocker.patch("backend.app.services.task.task_service.task_service.update_task", new=AsyncMock())
    mocker.patch("backend.app.services.task.task_service.task_service.is_cancelled", new=AsyncMock(return_value=False))
    mocker.patch("backend.app.core.minio.MinioManager.upload_file", new=AsyncMock())
    
    # Mocking Ingestion Service to return 5 chunks
    mock_ingestion = mocker.patch(
        "backend.app.services.document.document_ingestion_service.document_ingestion_service.index_document", 
        new=AsyncMock(return_value=5)
    )

    content = b"test document content"
    
    await document_service.run_ingestion(
        task_id="task-456",
        safe_filename="test.pdf",
        content=content,
        content_type="application/pdf",
        workspace_id="my-workspace"
    )
    
    # Verify ingestion service WAS called for normal workspace
    mock_ingestion.assert_called_once()
    
    # Check final update call (completed status)
    last_task_update = task_service.update_task.call_args_list[-1]
    assert last_task_update[1]["status"] == "completed"
    assert "indexed (5 fragments)" in last_task_update[1]["message"]
