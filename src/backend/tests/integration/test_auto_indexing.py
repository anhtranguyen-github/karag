from unittest.mock import AsyncMock, MagicMock

import pytest
from src.backend.app.services.document_service import document_service


def get_mock_db():
    mock_db = MagicMock()
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

    # Allow both db.coll and db["coll"]
    mock_db.__getitem__.return_value = mock_col
    mock_db.workspaces = mock_col
    mock_db.documents = mock_col
    mock_db.thread_metadata = mock_col
    mock_db.workspace_settings = mock_col
    mock_db.tasks = mock_col
    return mock_db, mock_col


@pytest.mark.asyncio
async def test_run_ingestion_auto_indexing_triggered_by_workspace(mocker):
    """Verify that indexing is triggered automatically when a workspace_id is provided."""
    # Mock dependencies
    mock_db, mock_col = get_mock_db()
    mocker.patch(
        "src.backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )
    mocker.patch(
        "src.backend.app.services.document.document_upload_service.minio_manager.upload_file",
        return_value="path/to/file",
    )
    mock_indexing = mocker.patch(
        "src.backend.app.services.document.document_ingestion_service.document_ingestion_service.index_document",
        new_callable=AsyncMock,
    )
    mock_indexing.return_value = 10  # 10 chunks

    # Mock task update
    mocker.patch(
        "src.backend.app.services.task.task_service.task_service.update_task",
        new_callable=AsyncMock,
    )
    mocker.patch(
        "src.backend.app.services.task.task_service.task_service.is_cancelled",
        new_callable=AsyncMock,
        return_value=False,
    )

    # Ingestion params
    task_id = "test-task"
    filename = "test.pdf"
    content = b"fake pdf content"
    content_type = "application/pdf"
    workspace_id = "test-workspace-123"

    await document_service.run_ingestion(task_id, filename, content, content_type, workspace_id)

    # Verify indexing was called
    mock_indexing.assert_awaited_once()
    # Check if the call included workspace_id
    args, kwargs = mock_indexing.call_args
    assert args[1] == workspace_id


@pytest.mark.asyncio
async def test_run_ingestion_vault_indexing(mocker):
    """Verify that indexing IS triggered when uploading to vault."""
    # Mock dependencies
    mock_db, mock_col = get_mock_db()
    mocker.patch(
        "src.backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )
    mocker.patch(
        "src.backend.app.services.document.document_upload_service.minio_manager.upload_file",
        return_value="vault/test.pdf",
    )

    # We want to ensure indexing_service.index_document IS called.
    # Note: indexing_service is imported inside run_ingestion, so we patch the module attribute
    mock_indexing = mocker.patch(
        "src.backend.app.services.document.document_ingestion_service.document_ingestion_service.index_document",
        new_callable=AsyncMock,
    )
    mock_indexing.return_value = 5  # 5 chunks

    mocker.patch(
        "src.backend.app.services.task.task_service.task_service.update_task",
        new_callable=AsyncMock,
    )
    mocker.patch(
        "src.backend.app.services.task.task_service.task_service.is_cancelled",
        new_callable=AsyncMock,
        return_value=False,
    )

    task_id = "test-task-vault"
    filename = "vault-file.pdf"
    content = b"vault content"
    content_type = "application/pdf"
    workspace_id = "vault"

    await document_service.run_ingestion(task_id, filename, content, content_type, workspace_id)

    # Verify indexing WAS called
    mock_indexing.assert_awaited_once()

