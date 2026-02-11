import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.mongodb import mongodb_manager
from backend.app.core.settings_manager import settings_manager
from backend.app.services.document_service import document_service

@pytest.fixture(autouse=True)
def reset_mongo():
    mongodb_manager._async_client = None

@pytest.mark.asyncio
async def test_workspace_rag_configuration():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ws_name = f"RAG WS {uuid.uuid4().hex[:6]}"
        payload = {
            "name": ws_name,
            "embedding_provider": "local",
            "embedding_dim": 768,
            "chunk_size": 500,
            "chunk_overlap": 50
        }
        res = await ac.post("/workspaces/", json=payload)
        assert res.status_code == 200, res.text
        data_wrapper = res.json()
        assert data_wrapper["success"] is True
        data = data_wrapper["data"]
        assert "id" in data
        ws_id = data["id"]
        
        # Verify settings were stored
        settings = await settings_manager.get_settings(ws_id)
        assert settings.embedding_provider == "local"
        assert settings.embedding_dim == 768
        assert settings.chunk_size == 500
        assert settings.chunk_overlap == 50

@pytest.mark.asyncio
async def test_document_sharing_dimension_conflict(mocker):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create Source WS (OpenAI 1536)
        ws1_name = f"Conflict Source {uuid.uuid4().hex[:6]}"
        ws1 = await ac.post("/workspaces/", json={"name": ws1_name, "embedding_dim": 1536})
        assert ws1.status_code == 200, ws1.text
        ws1_id = ws1.json()["data"]["id"]
        
        # 2. Create Target WS (Local 768)
        ws2_name = f"Conflict Target {uuid.uuid4().hex[:6]}"
        ws2 = await ac.post("/workspaces/", json={"name": ws2_name, "embedding_dim": 768})
        assert ws2.status_code == 200, ws2.text
        ws2_id = ws2.json()["data"]["id"]
        
        # 3. Create dummy doc record in DB
        db = mongodb_manager.get_async_database()
        doc_id = f"test_conflict_{uuid.uuid4().hex[:6]}"
        filename = f"conflict_{uuid.uuid4().hex[:6]}.pdf"
        ws1_settings = await settings_manager.get_settings(ws1_id)
        await db.documents.insert_one({
            "id": doc_id,
            "filename": filename,
            "workspace_id": ws1_id,
            "minio_path": "any",
            "status": "indexed",
            "rag_config_hash": ws1_settings.get_rag_hash(),
            "shared_with": []
        })
        
        # 4. Attempt share without forcing re-index
        payload = {
            "name": filename,
            "target_workspace_id": ws2_id,
            "action": "share",
            "force_reindex": False
        }
        res = await ac.post("/documents/update-workspaces", json=payload)
        
        # Should return 409 Conflict
        assert res.status_code == 409
        assert "Incompatible Workspace" in res.json()["detail"]

@pytest.mark.asyncio
async def test_vault_delete_logic(mocker):
    # Mocking minio and qdrant to avoid side effects
    mocker.patch("backend.app.core.minio.minio_manager.delete_file")
    mocker.patch("backend.app.rag.qdrant_provider.qdrant.delete_document")
    mocker.patch("backend.app.rag.qdrant_provider.qdrant.client.set_payload")
    
    # Mock Qdrant collection operations for vault deletion
    mock_collection_exists = mocker.patch("backend.app.rag.qdrant_provider.qdrant.client.collection_exists")
    mock_collection_exists.return_value = False  # No collections to delete from
    mocker.patch("backend.app.rag.qdrant_provider.qdrant.client.delete")
    mocker.patch("backend.app.rag.qdrant_provider.qdrant.get_collection_name", return_value="knowledge_base_1536")
    
    # Mock settings manager for local deletion with proper return value
    from unittest.mock import AsyncMock, MagicMock
    mock_settings = MagicMock()
    mock_settings.embedding_dim = 1536
    mock_get_settings = AsyncMock(return_value=mock_settings)
    mocker.patch("backend.app.core.settings_manager.settings_manager.get_settings", mock_get_settings)

    db = mongodb_manager.get_async_database()
    ws_id = "ws_vault_test"
    doc_name = "vault_test.txt"
    doc_id = "vtest123"
    
    # Cleanup any leftover test data from previous runs
    await db.documents.delete_many({"id": doc_id})
    
    await db.documents.insert_one({
        "id": doc_id,
        "filename": doc_name,
        "workspace_id": ws_id,
        "minio_path": "path/to/file",
        "shared_with": []
    })
    
    # 1. Soft Delete (move to vault)
    await document_service.delete(doc_name, ws_id, vault_delete=False)
    
    doc = await db.documents.find_one({"id": doc_id})
    assert doc["workspace_id"] == "vault"
    
    # 2. Permanent Purge
    await document_service.delete(doc_name, "vault", vault_delete=True)
    
    doc_after = await db.documents.find_one({"id": doc_id})
    assert doc_after is None
