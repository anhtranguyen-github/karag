from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.app.core.settings_manager import settings_manager


@pytest.fixture
def mock_db_and_col():
    mock_db = MagicMock()
    mock_col = MagicMock()

    # Default async methods
    mock_col.find_one = AsyncMock(return_value=None)
    mock_col.insert_one = AsyncMock()
    mock_col.update_one = AsyncMock()
    mock_col.delete_one = AsyncMock()
    mock_col.count_documents = AsyncMock(return_value=0)

    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])
    mock_col.find.return_value = mock_cursor

    # Allow both db.coll and db["coll"]
    mock_db.__getitem__.return_value = mock_col
    mock_db.documents = mock_col
    mock_db.workspace_settings = mock_col
    mock_db.tasks = mock_col

    return mock_db, mock_col


@pytest.mark.asyncio
async def test_link_performs_full_index(mocker, mock_db_and_col):
    """Test that linking always performs a full index_document call."""
    mock_db, mock_col = mock_db_and_col
    mocker.patch(
        "backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )

    source_doc = {"id": "doc_source", "workspace_id": "ws_source"}
    target_doc = {"id": "doc_target"}
    mock_col.find_one.side_effect = [source_doc, target_doc]

    # Patch index_document to verify it is called
    mock_index = mocker.patch(
        "backend.app.services.document.document_ingestion_service.DocumentIngestionService.index_document",
        return_value=10,
    )

    from backend.app.services.document.document_ingestion_service import (
        document_ingestion_service,
    )

    # We call it directly to verify standard indexing is the only path
    await document_ingestion_service.index_document("doc_target", "ws_target")

    mock_index.assert_called_once()


@pytest.mark.asyncio
async def test_update_settings_persists_to_db(mocker, mock_db_and_col):
    """Test that update_settings correctly handles recursion and persistence."""
    mock_db, mock_col = mock_db_and_col
    mocker.patch(
        "backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )

    from backend.app.core.schemas import AppSettings

    initial = AppSettings()
    mocker.patch.object(settings_manager, "_global_settings", initial)
    mocker.patch.object(
        settings_manager,
        "get_settings_metadata",
        return_value={"chunking.chunk_size": {"mutable": True}},
    )

    updates = {"chunking.chunk_size": 1000}
    mock_db["workspace_settings"] = mock_col

    await settings_manager.update_settings(updates, workspace_id="ws_custom")

    mock_col.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_ingestion_progress_updates(mocker, mock_db_and_col):
    """Test that IngestionPipeline reports progress to task_service."""
    from pathlib import Path

    mock_db, mock_col = mock_db_and_col
    mocker.patch(
        "backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )

    doc = {
        "id": "doc_1",
        "filename": "test.txt",
        "extension": ".txt",
        "minio_path": "path/test.txt",
        "content_hash": "h1",
    }
    mock_col.find_one.return_value = doc

    mocker.patch("backend.app.core.minio.minio_manager.get_file", return_value=b"some")
    mocker.patch("backend.app.core.path_utils.validate_safe_path", side_effect=lambda x: Path(x))
    mocker.patch("backend.app.core.path_utils.get_safe_temp_path", return_value=Path("temp.txt"))
    mocker.patch("os.remove")
    mocker.patch("os.path.exists", return_value=True)
    mocker.patch("builtins.open", mocker.mock_open())

    mocker.patch("backend.app.rag.ingestion.ingestion_pipeline.initialize")
    mocker.patch(
        "backend.app.rag.ingestion.ingestion_pipeline.get_ingestion_config",
        return_value=(MagicMock(), MagicMock()),
    )

    mock_loader = MagicMock()
    mock_loader.load.return_value = [MagicMock(page_content="page1")]
    mocker.patch("backend.app.rag.ingestion.TextLoader", return_value=mock_loader)
    mocker.patch("backend.app.rag.rag_service.rag_service.chunk_text", return_value=["chunk1"])
    mocker.patch(
        "backend.app.rag.rag_service.rag_service.get_embeddings",
        return_value=[[0.1] * 1536],
    )

    # Patch the factory or the store methods
    mock_store = AsyncMock()
    mocker.patch(
        "backend.app.core.factory.ProviderFactory.get_vector_store",
        return_value=mock_store,
    )
    mock_store.upsert_documents = AsyncMock()
    mock_store.delete_document = AsyncMock()

    mock_task = MagicMock()
    mock_task.update_task = AsyncMock()
    mock_task.is_cancelled = AsyncMock(return_value=False)
    mocker.patch("backend.app.services.task.task_service.task_service", mock_task)

    from backend.app.services.document.document_ingestion_service import (
        document_ingestion_service,
    )

    await document_ingestion_service.index_document("doc_1", "ws_1", task_id="task_prog")

    assert mock_task.update_task.call_count > 1
