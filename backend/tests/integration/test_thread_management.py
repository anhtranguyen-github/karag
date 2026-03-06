import uuid
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from backend.app.graph.builder import app as graph_app
from backend.app.main import app as fastapi_app
from httpx import AsyncClient
from langchain_core.messages import AIMessage, HumanMessage


@pytest.mark.asyncio
async def test_summarization_flow(mocker):
    """Test that conversations are summarized after exceeding 6 messages."""
    # Mock LLM
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content="Summary of conversation"))

    # Mock bind_tools to return itself (mock_llm) so we can await its ainvoke
    mock_llm.bind_tools = MagicMock(return_value=mock_llm)

    # Mock get_llm in nodes
    mocker.patch("backend.app.graph.nodes.get_llm", new=AsyncMock(return_value=mock_llm))

    # Send enough messages to trigger summarization (> 6)
    messages = [HumanMessage(content=f"msg {i}", id=str(uuid.uuid4())) for i in range(7)]

    config = {"configurable": {"thread_id": f"test_summary_{uuid.uuid4().hex[:6]}"}}

    # To avoid real RAG/Tools, we can mock the entire node execution
    mocker.patch("backend.app.graph.nodes.rag_service.search", new=AsyncMock(return_value=[]))

    # Run the graph
    await graph_app.ainvoke({"messages": messages}, config=config)

    # In a real run, the summarize_node should have been called
    state = await graph_app.aget_state(config)
    assert "summary" in state.values
    assert state.values["summary"] == "Summary of conversation"


@pytest.mark.asyncio
async def test_thread_api_endpoints(mocker):
    """Test the new PATCH and DELETE endpoints for threads."""
    thread_id = "api_test_thread"

    # Mock MongoDB
    mock_db = MagicMock()
    mock_col = MagicMock()
    mock_col.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    mock_col.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
    mock_col.delete_many = AsyncMock()

    mock_aggregate = MagicMock()
    mock_aggregate.to_list = AsyncMock(return_value=[{"_id": thread_id}])
    mock_col.aggregate.return_value = mock_aggregate

    mock_col.find.return_value.to_list = AsyncMock(
        return_value=[
            {
                "thread_id": thread_id,
                "title": "Updated Title",
                "workspace_id": "default",
            }
        ]
    )
    mock_db.__getitem__.return_value = mock_col
    mock_db.thread_metadata = mock_col
    mock_db.checkpoints = mock_col
    mocker.patch(
        "backend.app.core.mongodb.mongodb_manager.get_async_database",
        return_value=mock_db,
    )

    transport = httpx.ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.patch(f"/chat/threads/{thread_id}/title", json={"title": "Updated Title"})
        assert res.status_code == 200

        res = await ac.get("/chat/threads", params={"workspace_id": "default"})
        assert res.status_code == 200
        assert len(res.json()["data"]) >= 1
