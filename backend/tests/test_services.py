import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from backend.app.services.document_service import document_service
from backend.app.services.workspace_service import workspace_service
import io

def get_mock_db():
    mock_db = MagicMock()
    mock_col = MagicMock()
    
    # Default async methods
    mock_col.find_one = AsyncMock(return_value=None)
    mock_col.insert_one = AsyncMock()
    mock_col.update_one = AsyncMock()
    mock_col.delete_one = AsyncMock()
    mock_col.delete_many = AsyncMock()
    mock_col.find_one_and_update = AsyncMock()
    
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_col.find.return_value = mock_cursor
    mock_col.count_documents = AsyncMock(return_value=0)
    
    # Allow both db.coll and db["coll"]
    mock_db.__getitem__.return_value = mock_col
    mock_db.documents = mock_col
    mock_db.workspaces = mock_col
    mock_db.thread_metadata = mock_col
    mock_db.workspace_settings = mock_col
    
    return mock_db, mock_col

@pytest.mark.asyncio
async def test_document_service_list_all(mocker):
    mock_db, mock_col = get_mock_db()
    
    mock_doc = {
        "_id": "69819596c9069bc9f72d0f88",
        "id": "test-id",
        "workspace_id": "ws-1",
        "filename": "test.pdf",
        "extension": ".pdf",
        "minio_path": "ws-1/test-id/v1/test.pdf",
        "status": "indexed",
        "chunks": 1,
        "shared_with": []
    }
    
    mock_col.find.return_value.to_list.return_value = [mock_doc]
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    
    docs = await document_service.list_all()
    assert len(docs) == 1
    assert docs[0]["filename"] == "test.pdf"

@pytest.mark.asyncio
async def test_workspace_service_create(mocker):
    mock_db, mock_col = get_mock_db()
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    # Mock settings manager to avoid real DB calls during workspace creation
    mocker.patch("backend.app.core.settings_manager.settings_manager.update_settings", new=AsyncMock())
    
    ws_result = await workspace_service.create({"name": "New Workspace", "description": "Description"})
    assert ws_result["status"] == "success"
    assert ws_result["data"]["name"] == "New Workspace"
    assert len(ws_result["data"]["id"]) == 8
    assert mock_col.insert_one.call_count == 2

@pytest.mark.asyncio
async def test_document_service_delete(mocker):
    mock_db, mock_col = get_mock_db()
    
    mock_doc = {
        "id": "doc-123",
        "workspace_id": "default",
        "minio_path": "ws/doc/v1/test.pdf",
        "content_hash": "hash-123"
    }
    mock_col.find_one.return_value = mock_doc
    
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    mock_minio = mocker.patch("backend.app.services.document.storage_service.minio_manager.delete_file")
    
    # Mock Qdrant client methods
    mock_qdrant_client = MagicMock()
    mock_qdrant_client.collection_exists = AsyncMock(return_value=False) # Skip qdrant loops for simplicity
    mock_qdrant_client.delete = AsyncMock()
    mocker.patch("backend.app.services.document.storage_service.qdrant.client", mock_qdrant_client)
    
    await document_service.delete("test.pdf", "default", vault_delete=True)
    
    mock_minio.assert_called_once_with("ws/doc/v1/test.pdf")
    mock_col.delete_many.assert_called_once_with({"minio_path": "ws/doc/v1/test.pdf"})
