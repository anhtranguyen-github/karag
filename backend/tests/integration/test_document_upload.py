from unittest.mock import AsyncMock, MagicMock

import pytest
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
async def test_upload_to_vault_auto_indexes(mocker):
    """Test that uploading to 'vault' now also triggers neural indexing based on user feedback."""
    mock_db, mock_col = get_mock_db()
    mocker.patch(
        "backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )

    # Mocking Task Service
    mocker.patch(
        "backend.app.services.task.task_service.task_service.update_task",
        new=AsyncMock(),
    )
    mocker.patch(
        "backend.app.services.task.task_service.task_service.is_cancelled",
        new=AsyncMock(return_value=False),
    )

    # Mocking MinIO
    mocker.patch("backend.app.core.minio.MinioManager.upload_file", new=AsyncMock())

    # Mocking Document Ingestion Service
    mock_ingestion = mocker.patch(
        "backend.app.services.document.document_ingestion_service.document_ingestion_service.index_document",
        new=AsyncMock(return_value=1),
    )

    # Create dummy file content
    content = b"test document content"

    # Execute run_ingestion background task
    await document_service.run_ingestion(
        task_id="task-123",
        filename="test.pdf",
        content=content,
        content_type="application/pdf",
        workspace_id="vault",
    )

    # Verify ingestion service WAS called
    mock_ingestion.assert_awaited_once()


@pytest.mark.asyncio
async def test_upload_to_workspace_auto_indexes(mocker):
    """Test that uploading to a real workspace triggers neural indexing."""
    mock_db, mock_col = get_mock_db()
    mocker.patch(
        "backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )

    mocker.patch(
        "backend.app.services.task.task_service.task_service.update_task",
        new=AsyncMock(),
    )
    mocker.patch(
        "backend.app.services.task.task_service.task_service.is_cancelled",
        new=AsyncMock(return_value=False),
    )
    mocker.patch("backend.app.core.minio.MinioManager.upload_file", new=AsyncMock())

    # Mocking Ingestion Service to return 5 chunks
    mock_ingestion = mocker.patch(
        "backend.app.services.document.document_ingestion_service.document_ingestion_service.index_document",
        new=AsyncMock(return_value=5),
    )

    content = b"test document content"

    await document_service.run_ingestion(
        task_id="task-456",
        filename="test.pdf",
        content=content,
        content_type="application/pdf",
        workspace_id="my-workspace",
    )

    # Verify ingestion service WAS called for normal workspace
    mock_ingestion.assert_called_once()

    # Check final update call (completed status)
    last_task_update = task_service.update_task.call_args_list[-1]
    assert last_task_update[1]["status"] == "completed"
    assert "indexed (5 chunks)" in last_task_update[1]["message"]


@pytest.mark.asyncio
async def test_upload_resilience_on_qdrant_403(mocker):
    """Verify that the system doesn't crash if Qdrant returns 403 during indexing."""
    mock_db, mock_col = get_mock_db()
    mocker.patch(
        "backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )
    mocker.patch("backend.app.core.minio.MinioManager.upload_file", new=AsyncMock())

    # Simulate Qdrant throwing a Forbidden error during create_collection
    mocker.patch(
        "backend.app.rag.store.qdrant.QdrantStore.create_collection_if_not_exists",
        new=AsyncMock(side_effect=Exception("Forbidden: 403")),
    )

    # Mock task update
    mocker.patch(
        "backend.app.services.task.task_service.task_service.update_task",
        new=AsyncMock(),
    )

    try:
        await document_service.run_ingestion(
            task_id="task-789",
            filename="resilience.pdf",
            content=b"content",
            content_type="application/pdf",
            workspace_id="test-ws",
        )
    except Exception as e:
        pytest.fail(f"Ingestion crashed on Qdrant 403: {e}")
