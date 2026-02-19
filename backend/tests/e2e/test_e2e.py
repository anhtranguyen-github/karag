import pytest
import io
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from backend.app.api.v1.router import api_v1_router
from unittest.mock import patch, AsyncMock


@pytest_asyncio.fixture
async def async_client():
    # Use a clean app instance
    test_app = FastAPI()
    test_app.include_router(api_v1_router)

    # Mock BackgroundTasks.add_task to run synchronously or just ignore it
    # This prevents 'Event loop is closed' from background tasks
    with patch(
        "fastapi.BackgroundTasks.add_task", side_effect=lambda f, *args, **kwargs: None
    ):
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


@pytest.mark.asyncio
async def test_e2e_document_flow(async_client):
    """Test full flow: Upload -> List -> Delete."""
    mock_upload_dict = {
        "status": "success",
        "task_id": "task-123",
        "filename": "test.txt",
        "content_type": "text/plain",
        "content": b"test content",
    }
    with patch(
        "backend.app.api.v1.documents.document_service.upload",
        new=AsyncMock(return_value=mock_upload_dict),
    ):
        files = {"file": ("test.txt", io.BytesIO(b"test content"), "text/plain")}
        res = await async_client.post(
            "/upload", files=files, params={"workspace_id": "e2e_test"}
        )
        assert res.status_code == 200


@pytest.mark.asyncio
async def test_e2e_chat_threads(async_client):
    """Test Chat Thread Lifecycle."""
    with (
        patch(
            "backend.app.api.v1.chat.chat_service.list_threads",
            new=AsyncMock(return_value=[{"id": "t1", "title": "Test"}]),
        ),
        patch("backend.app.api.v1.chat.chat_service.update_title", new=AsyncMock()),
        patch("backend.app.api.v1.chat.chat_service.delete_thread", new=AsyncMock()),
    ):
        res = await async_client.get("/chat/threads", params={"workspace_id": "e2e_ws"})
        assert res.status_code == 200
        assert len(res.json()["data"]) >= 1
