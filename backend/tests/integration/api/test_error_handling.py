import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_global_exception_handler_and_cors(mocker):
    """Test that unhandled exceptions return JSON and include CORS headers."""
    # We can use any existing endpoint and mock a service it calls to raise an exception
    # Let's mock document_service.list_all which is used by /documents-all
    mocker.patch(
        "backend.app.api.v1.documents.document_service.list_all",
        side_effect=ValueError("Test crash"),
    )

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Include Origin header to trigger CORS
        origin = "http://localhost:3000"
        response = await ac.get("/documents-all", headers={"Origin": origin})

    assert response.status_code == 500

    # Verify it's valid JSON (this was failing before, returning raw text)
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "INTERNAL_SERVER_ERROR"
    assert data["message"] == "An unexpected error occurred."

    # Verify CORS headers are present even on 500 error
    # Note: CORSMiddleware in FastAPI usually handles this correctly IF the response is a Response object
    assert response.headers.get("access-control-allow-origin") == origin
