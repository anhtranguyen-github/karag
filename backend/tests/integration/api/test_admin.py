import pytest
from backend.app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_admin_prompts():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/admin/prompts")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "rag_system" in data["data"]


@pytest.mark.asyncio
async def test_admin_vector_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/admin/vector/status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "status" in data["data"]


@pytest.mark.asyncio
async def test_admin_ops_overview():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/admin/ops/overview")
    assert response.status_code == 200
    assert response.json()["data"]["services"]["vector_store"] == "healthy"
