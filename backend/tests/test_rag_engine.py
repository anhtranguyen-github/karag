import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.mongodb import mongodb_manager
from backend.app.rag.rag_service import rag_service

# Force motor to recreate client if loop changes
def reset_mongo():
    mongodb_manager._async_client = None

@pytest.fixture(autouse=True)
def setup_teardown():
    reset_mongo()
    yield

@pytest.mark.asyncio
async def test_create_workspace_with_rag_engine():
    """Verify that a workspace can be created with a specific rag_engine."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ws_name = f"Graph WS {uuid.uuid4().hex[:6]}"
        res = await ac.post("/workspaces/", json={
            "name": ws_name,
            "rag_engine": "graph",
            "neo4j_uri": "bolt://test:7687"
        })
        assert res.status_code == 200
        ws_id = res.json()["data"]["id"]
        
        # Verify settings
        from backend.app.core.settings_manager import settings_manager
        settings = await settings_manager.get_settings(ws_id)
        assert settings.rag_engine == "graph"
        assert settings.neo4j_uri == "bolt://test:7687"

@pytest.mark.asyncio
async def test_rag_engine_immutability():
    """Verify that the rag_engine cannot be changed after creation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ws_name = f"Basic WS {uuid.uuid4().hex[:6]}"
        res = await ac.post("/workspaces/", json={
            "name": ws_name,
            "rag_engine": "basic"
        })
        ws_id = res.json()["data"]["id"]
        
        # Try to update rag_engine to graph along with a valid name change
        update_res = await ac.patch(f"/workspaces/{ws_id}", json={
            "name": f"{ws_name} Updated",
            "rag_engine": "graph"
        })
        assert update_res.status_code == 200
        
        # Settings should still be basic
        from backend.app.core.settings_manager import settings_manager
        settings = await settings_manager.get_settings(ws_id)
        assert settings.rag_engine == "basic"
        assert update_res.json()["data"]["name"] == f"{ws_name} Updated"

@pytest.mark.asyncio
async def test_rag_service_search_branching(mocker):
    """Unit test for rag_service.search branching logic."""
    from backend.app.core.settings_manager import settings_manager
    from backend.app.rag.graph_provider import graph_provider
    from backend.app.rag.qdrant_provider import qdrant
    
    # Mock settings
    mock_settings = mocker.patch("backend.app.core.settings_manager.SettingsManager.get_settings")
    
    # Mock providers
    mock_graph_search = mocker.patch("backend.app.rag.graph_provider.GraphProvider.search")
    mock_hybrid_search = mocker.patch("backend.app.rag.qdrant_provider.QdrantProvider.hybrid_search")
    mocker.patch("backend.app.rag.rag_service.RAGService.get_query_embedding", return_value=[0.1]*1536)

    # Test Case 1: Graph Engine
    mock_settings.return_value = mocker.Mock(rag_engine="graph", search_limit=5)
    await rag_service.search("query", "ws_graph")
    mock_graph_search.assert_called_once()
    mock_hybrid_search.assert_not_called()
    
    # Reset mocks
    mock_graph_search.reset_mock()
    mock_hybrid_search.reset_mock()
    
    # Test Case 2: Basic Engine
    mock_settings.return_value = mocker.Mock(rag_engine="basic", search_limit=5, retrieval_mode="hybrid", hybrid_alpha=0.5)
    await rag_service.search("query", "ws_basic")
    mock_hybrid_search.assert_called_once()
    mock_graph_search.assert_not_called()
