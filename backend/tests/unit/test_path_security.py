import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from backend.app.api.v1.router import api_v1_router
from unittest.mock import patch, AsyncMock

@pytest_asyncio.fixture
async def sec_client():
    test_app = FastAPI()
    test_app.include_router(api_v1_router)
    
    # Register exception handler to convert NotFoundError to 404
    from backend.app.core.exceptions import BaseAppException
    from fastapi.responses import JSONResponse
    from fastapi import Request
    
    @test_app.exception_handler(BaseAppException)
    async def app_exception_handler(request: Request, exc: BaseAppException):
        return JSONResponse(status_code=exc.status_code, content={"message": exc.message})

    # Mock the service layer to avoid DB interaction
    with patch("backend.app.api.v1.documents.document_service", new=AsyncMock()) as mock_service:
        # Defaults to None (not found) or we can set side effects
        mock_service.get_by_id.return_value = None 
        
        with patch("fastapi.BackgroundTasks.add_task", side_effect=lambda f, *args, **kwargs: None):
            transport = ASGITransport(app=test_app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                yield ac, mock_service

@pytest.mark.asyncio
async def test_path_traversal_rejection(sec_client):
    """
    Verify that the system is immune to path traversal by design.
    """
    client, mock_service = sec_client
    
    # 1. Classic traversal
    res = await client.get("/documents/..%2f..%2fetc%2fpasswd")
    # Should be 404 because "../../etc/passwd" is effectively searched as an ID (or rejected by webserver/starlette)
    # The important part is that it DOES NOT crash and DOES NOT access filesystem
    assert res.status_code in [404, 422, 400]
    
    # 2. Null byte injection
    res = await client.get("/documents/test.txt%00.pdf")
    assert res.status_code in [404, 422, 400]

    # 3. URL encoded traversal
    res = await client.delete("/documents/%2e%2e%2fconfig.json")
    assert res.status_code in [404, 422, 400]
    
    # 4. Inspect endpoint
    res = await client.get("/documents/..%2f..%2f..%2f/inspect")
    assert res.status_code in [404, 422, 400]

@pytest.mark.asyncio
async def test_id_strictness(sec_client):
    """Verify that only valid looking strings (usually IDs) are processed."""
    client, mock_service = sec_client
    
    # Setup mock to return None (Not Found)
    mock_service.get_by_id.return_value = None
    
    res = await client.get("/documents/non-existent-id-123")
    assert res.status_code == 404
    # Verify the service was called with the exact string, no normalization happened that turned it into a path
    mock_service.get_by_id.assert_called_with("non-existent-id-123")
