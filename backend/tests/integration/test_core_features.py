import pytest
import uuid
import asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.mongodb import mongodb_manager
from backend.app.schemas.execution import ExecutionMode

@pytest.fixture(autouse=True)
def reset_mongo():
    mongodb_manager._async_client = None

@pytest.mark.asyncio
async def test_workspace_varied_strategies():
    """Test creating workspaces with different retrieval and generation strategies."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Advanced Reasoning Workspace
        res = await ac.post("/workspaces/", json={
            "name": f"Reasoning {uuid.uuid4().hex[:4]}",
            "llm_provider": "openai",
            "llm_model": "gpt-4o",
            "temperature": 0.2,
            "rag_engine": "graph",
            "reranker_enabled": True
        })
        assert res.status_code == 200
        ws_id = res.json()["data"]["id"]
        
        # Verify via details
        det = await ac.get(f"/workspaces/{ws_id}/details")
        assert det.status_code == 200
        settings = det.json()["data"]["settings"]
        assert settings["retrieval"]["rerank"]["enabled"] is True

        # 2. Fast Local Workspace
        res2 = await ac.post("/workspaces/", json={
            "name": f"Fast {uuid.uuid4().hex[:4]}",
            "llm_provider": "local",
            "embedding_provider": "local",
            "rag_engine": "basic"
        })
        assert res2.status_code == 200

@pytest.mark.asyncio
async def test_document_upload_and_vault():
    """Test uploading to a workspace and then moving to vault."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create WS
        ws_res = await ac.post("/workspaces/", json={"name": f"Upload Test {uuid.uuid4().hex[:4]}"})
        debug_json = ws_res.json()
        assert ws_res.status_code == 200, f"Create WS failed: {debug_json}"
        ws_id = debug_json["data"]["id"]
        
        # 1. Mock Upload to Workspace (Direct DB insertion for test isolation if service upload is too heavy for unit tests)
        db = mongodb_manager.get_async_database()
        doc_id = f"doc_{uuid.uuid4().hex[:6]}"
        await db.documents.insert_one({
            "id": doc_id,
            "filename": "test.txt",
            "workspace_id": ws_id,
            "status": "indexed",
            "shared_with": []
        })
        
        # 2. Test Soft Delete (Move to Vault)
        # Using the API instead of direct service call for integration test
        del_res = await ac.delete(f"/documents/{doc_id}?workspace_id={ws_id}&vault_delete=false")
        assert del_res.status_code == 200
        
        # Verify it's in vault
        doc = await db.documents.find_one({"id": doc_id})
        assert doc["workspace_id"] == "vault"

@pytest.mark.asyncio
async def test_langgraph_execution_scenarios():
    """Test LangGraph execution through the chat stream API with different modes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ws_res = await ac.post("/workspaces/", json={"name": f"Graph Test {uuid.uuid4().hex[:4]}"})
        debug_json = ws_res.json()
        assert ws_res.status_code == 200, f"Create WS failed: {debug_json}"
        ws_id = debug_json["data"]["id"]
        thread_id = str(uuid.uuid4())
        
        # Test Fast Mode Stream (just check if it hits the endpoint and returns SSE)
        payload = {
            "message": "Hello",
            "thread_id": thread_id,
            "workspace_id": ws_id,
            "execution": {"execution_mode": "fast"}
        }
        
        # We use a POST request. Streaming response testing is tricky with AsyncClient 
        # but we can verify it doesn't 500.
        async with ac.stream("POST", "/chat/stream", json=payload) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
            # Read first chunk to ensure it started
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    break 
                break

@pytest.mark.asyncio
async def test_graph_navigation_crud():
    """Test graph-specific configuration persistence."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/workspaces/", json={
            "name": f"Graph Config {uuid.uuid4().hex[:4]}",
            "rag_engine": "graph",
            "graph_enabled": True
        })
        debug_json = res.json()
        assert res.status_code == 200, f"Create WS failed: {debug_json}"
        ws_id = debug_json["data"]["id"]
        
        det = await ac.get(f"/workspaces/{ws_id}/details")
        config = det.json()["data"]["settings"]["retrieval"]["graph"]
        assert config["enabled"] is True
