import pytest
from unittest.mock import AsyncMock
from backend.app.rag.qdrant_provider import QdrantProvider


@pytest.mark.asyncio
async def test_create_collection_adds_all_indexes(mocker):
    # Mock settings manager to return a dim
    mocker.patch(
        "backend.app.core.settings_manager.settings_manager.get_settings",
        return_value=AsyncMock(embedding_dim=1536),
    )

    provider = QdrantProvider()
    provider.client = AsyncMock()

    # Simulate collection NOT existing
    provider.client.collection_exists.return_value = False

    collection_name = "test_collection"
    await provider.create_collection(collection_name, vector_size=1536)

    # Verify collection was created
    provider.client.create_collection.assert_called_once()

    # Verify all payload indexes were called
    # We added text, doc_id, workspace_id, and shared_with
    calls = provider.client.create_payload_index.call_args_list
    indexed_fields = [call.kwargs["field_name"] for call in calls]

    assert "text" in indexed_fields
    assert "doc_id" in indexed_fields
    assert "workspace_id" in indexed_fields
    assert "shared_with" in indexed_fields


@pytest.mark.asyncio
async def test_create_collection_handles_forbidden(mocker):
    provider = QdrantProvider()
    provider.client = AsyncMock()

    # Simulate 403 Forbidden on collection_exists
    provider.client.collection_exists.side_effect = Exception("Forbidden: 403")

    result = await provider.create_collection("any_name")

    # Should return False instead of raising
    assert result is False
