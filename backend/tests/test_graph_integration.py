import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch
from backend.app.services.graph_service import graph_service
from backend.app.rag.graph_provider import graph_provider

@pytest.mark.asyncio
async def test_graph_extraction_logic(mocker):
    """Test that GraphService correctly parses and merges entity data."""
    mock_llm = MagicMock()
    # Mock return for a single chunk
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content=json.dumps([
        {
            "name": "Artificial Intelligence",
            "type": "Technology",
            "relationships": [{"target": "Machine Learning", "type": "INCLUDES"}]
        }
    ])))
    mocker.patch("backend.app.services.graph_service.get_llm", return_value=mock_llm)
    
    mock_upsert = mocker.patch("backend.app.rag.graph_provider.graph_provider.upsert_entities", new=AsyncMock())
    
    await graph_service.extract_and_store_graph("Some long text about AI.", "test_ws")
    
    # Check if upsert was called with merged data
    mock_upsert.assert_called_once()
    entities = mock_upsert.call_args[0][0]
    assert len(entities) == 1
    assert entities[0]["name"] == "Artificial Intelligence"

@pytest.mark.asyncio
async def test_graph_search_refinement(mocker):
    """Test that GraphProvider search correctly refines query using graph context."""
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="Machine Learning, Neural Networks"))
    mocker.patch("backend.app.rag.graph_provider.get_llm", return_value=mock_llm)
    
    # Mock Neo4j query
    mock_neo4j = mocker.patch("backend.app.core.neo4j.neo4j_manager.execute_query", new=AsyncMock(return_value=[
        {"entity": "Machine Learning", "relationship": "RELATED", "related_entity": "Deep Learning"}
    ]))
    
    # Mock Hybrid search
    mock_hybrid = mocker.patch("backend.app.rag.qdrant_provider.qdrant.hybrid_search", new=AsyncMock(return_value=[]))
    
    mocker.patch("backend.app.core.settings_manager.settings_manager.get_settings", 
                 return_value=MagicMock(rag_engine="graph", search_limit=5, hybrid_alpha=0.5))
    
    await graph_provider.search("Tell me about ML", [0.1]*1536, "test_ws")
    
    # Verify refined query actually contains discovered context
    args, kwargs = mock_hybrid.call_args
    assert "Deep Learning" in kwargs["query_text"]
    assert "Tell me about ML" in kwargs["query_text"]
