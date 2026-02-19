
import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.app.services.document_service import document_service

def get_mock_db():
    mock_db = MagicMock()
    mock_col = MagicMock()
    
    # Default async methods
    mock_col.find_one = AsyncMock(return_value=None)
    mock_col.insert_one = AsyncMock()
    mock_col.update_one = AsyncMock()
    mock_col.delete_one = AsyncMock()
    
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])
    mock_col.find.return_value = mock_cursor
    
    # Allow both db.coll and db["coll"]
    mock_db.__getitem__.return_value = mock_col
    mock_db.documents = mock_col
    mock_db.workspaces = mock_col
    
    return mock_db, mock_col

@pytest.mark.asyncio
async def test_inspect_missing_metadata(mocker):
    """Test that inspect() doesn't crash when optional fields are missing."""
    mock_db, mock_col = get_mock_db()
    
    # Minimal document missing many fields that were previously causing KeyError
    minimal_doc = {
        "id": "doc_minimal",
        "workspace_id": "vault",
        "content_hash": "hash123"
        # Missing: filename, extension, content_type, size, minio_path, created_at
    }
    
    mock_col.find_one.return_value = minimal_doc
    # Mock related_docs
    mock_col.find.return_value.to_list.side_effect = [[minimal_doc], []] # 1st for docs, 2nd for workspaces
    
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    
    result = await document_service.inspect("doc_minimal")
    
    assert "metadata" in result
    assert result["metadata"]["id"] == "doc_minimal"
    assert result["metadata"]["filename"] == "Unknown" # Default value
    assert result["metadata"]["minio_path"] == "N/A" # Default value
    assert "relationships" in result

@pytest.mark.asyncio
async def test_get_chunks_correct_collection(mocker):
    """Test that get_chunks uses the correct collection name via workspace_id."""
    mock_db, mock_col = get_mock_db()
    
    mock_doc = {
        "id": "doc_123",
        "workspace_id": "workspace_test"
    }
    mock_col.find_one.return_value = mock_doc
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    
    # Mock Qdrant
    mock_qdrant = MagicMock()
    mock_qdrant.get_collection_name = AsyncMock(return_value="kb_hash_1536")
    mock_qdrant.client.scroll = AsyncMock(return_value=([], None))
    mocker.patch("backend.app.rag.qdrant_provider.qdrant", mock_qdrant)
    
    await document_service.get_chunks("doc_123")
    
    # Verify it called get_collection_name with workspace_id
    mock_qdrant.get_collection_name.assert_called_once_with(workspace_id="workspace_test")
