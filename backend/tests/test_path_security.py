import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_path_traversal_rejection():
    """
    Verify that the system is immune to path traversal by design.
    The router now expects document_id (string), which is handled by the framework.
    Attempts to inject path traversal sequences should either:
    1. Be rejected by the router (404/422)
    2. Be treated as a literal illegal ID (404)
    3. NEVER reach the filesystem logic as a path.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Classic traversal
        res = await ac.get("/documents/..%2f..%2fetc%2fpasswd")
        assert res.status_code in [404, 422, 400]
        
        # 2. Null byte injection
        res = await ac.get("/documents/test.txt%00.pdf")
        assert res.status_code in [404, 422, 400]
        
        # 3. URL encoded traversal
        res = await ac.delete("/documents/%2e%2e%2fconfig.json")
        assert res.status_code in [404, 422, 400]

        # 4. Inspect endpoint
        res = await ac.get("/documents/..%2f..%2f..%2f/inspect")
        assert res.status_code in [404, 422, 400]

@pytest.mark.asyncio
async def test_id_strictness():
    """Verify that only valid looking strings (usually IDs) are processed."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # A legitimate looking ID should 404 if not found, but not error out
        res = await ac.get("/documents/non-existent-id-123")
        assert res.status_code == 404
        assert "not found" in res.json()["message"].lower()
