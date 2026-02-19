import pytest
from backend.app.rag.graph.orchestrator import rag_executor
from backend.app.schemas.execution import RuntimeSettings, ExecutionMode, ThinkingModeConfig
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_langgraph_fast_mode_direct_path():
    """Verify that Fast mode skips reflection and synthesis."""
    settings = RuntimeSettings(mode=ExecutionMode.FAST)
    initial_state = {
        "query": "What is RAG?",
        "workspace_id": "test-ws",
        "settings": settings,
        "generated_queries": [],
        "retrieved_results": [],
        "draft_answers": [],
        "loop_count": 0,
        "confidence_level": 0.0,
        "is_sufficient": False,
        "execution_metadata": {"nodes_visited": []}
    }

    with patch("backend.app.rag.graph.nodes.LangChainFactory.get_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_llm.ainvoke = MagicMock()
        mock_llm.ainvoke.return_value = MagicMock()
        mock_llm.ainvoke.return_value.__await__ = MagicMock(return_value=iter([MagicMock(content="Mock response")]))
        # Alternatively, use AsyncMock if available in unittest.mock (Python 3.8+)
        from unittest.mock import AsyncMock
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="Mock response"))
        mock_get_llm.return_value = mock_llm
        
        with patch("backend.app.rag.rag_service.rag_service.search") as mock_search:
            mock_search.return_value = [{"text": "RAG is..."}]
            
            final_state = await rag_executor.ainvoke(initial_state)
            
            assert final_state["loop_count"] == 0
            assert final_state["is_sufficient"] is True
            assert len(final_state["draft_answers"]) == 1

@pytest.mark.asyncio
async def test_langgraph_thinking_mode_loop():
    """Verify that Thinking mode can loop if context is insufficient."""
    from unittest.mock import AsyncMock
    settings = RuntimeSettings(mode=ExecutionMode.THINKING, thinking=ThinkingModeConfig(max_loops=2))
    initial_state = {
        "query": "Deep question",
        "workspace_id": "test-ws",
        "settings": settings,
        "generated_queries": [],
        "retrieved_results": [],
        "blended_context": None,
        "final_context": None,
        "draft_answers": [],
        "loop_count": 0,
        "confidence_level": 0.0,
        "is_sufficient": False,
        "execution_metadata": {"nodes_visited": []}
    }

    with patch("backend.app.rag.graph.nodes.LangChainFactory.get_llm") as mock_get_llm:
        mock_llm = MagicMock()
        # First reflection returns insufficient, second returns sufficient
        mock_llm.ainvoke = AsyncMock(side_effect=[
            MagicMock(content="complex"), # analyze_intent
            MagicMock(content="query variants"), # build_query_context
            MagicMock(content="no"), # reflect_and_decide loop 0 (insufficient)
            MagicMock(content="refined query"), # build_query_context loop 1
            MagicMock(content="yes"), # reflect_and_decide loop 1 (sufficient)
            MagicMock(content="Final answer"), # generate_answer
        ])
        mock_get_llm.return_value = mock_llm
        
        with patch("backend.app.rag.rag_service.rag_service.search") as mock_search:
            mock_search.return_value = [{"text": "Some info"}]
            
            final_state = await rag_executor.ainvoke(initial_state)
            
            # loop_count increments in reflect_and_decide. 
            # 1st reflect: loop_count 0 -> 1, 2nd reflect: loop_count 1 -> 2
            assert final_state["loop_count"] >= 1
            assert "Final answer" in final_state["draft_answers"][0]

@pytest.mark.asyncio
async def test_langgraph_blending_mode():
    """Verify that Blending mode generates multiple drafts and uses synthesizer."""
    from unittest.mock import AsyncMock
    settings = RuntimeSettings(mode=ExecutionMode.BLENDING)
    initial_state = {
        "query": "Multiple perspectives on X",
        "workspace_id": "test-ws",
        "settings": settings,
        "generated_queries": [],
        "retrieved_results": [],
        "blended_context": None,
        "final_context": None,
        "draft_answers": [],
        "loop_count": 0,
        "confidence_level": 0.0,
        "is_sufficient": False,
        "execution_metadata": {"nodes_visited": []}
    }

    with patch("backend.app.rag.graph.nodes.LangChainFactory.get_llm") as mock_get_llm:
        mock_llm = MagicMock()
        # analyze_intent, build_query_context, generate_answer x2, synthesize_answer
        mock_llm.ainvoke = AsyncMock(side_effect=[
            MagicMock(content="complex"), # analyze_intent
            MagicMock(content="query variants"), # build_query_context
            MagicMock(content="Draft 1"), # generate_answer call 1
            MagicMock(content="Draft 2"), # generate_answer call 2
            MagicMock(content="Sythesized answer"), # synthesize_answer
        ])
        mock_get_llm.return_value = mock_llm
        
        with patch("backend.app.rag.rag_service.rag_service.search") as mock_search:
            mock_search.return_value = [{"text": "Perspective A"}, {"text": "Perspective B"}]
            
            final_state = await rag_executor.ainvoke(initial_state)
            
            assert len(final_state["draft_answers"]) == 2
            assert final_state["final_answer"] == "Sythesized answer"

@pytest.mark.asyncio
async def test_langgraph_max_loops_exit():
    """Verify that the graph eventually exits even if info is insufficient."""
    from unittest.mock import AsyncMock
    settings = RuntimeSettings(mode=ExecutionMode.THINKING, thinking=ThinkingModeConfig(max_loops=1))
    initial_state = {
        "query": "Impossible question",
        "workspace_id": "test-ws",
        "settings": settings,
        "generated_queries": [],
        "retrieved_results": [],
        "blended_context": None,
        "final_context": None,
        "draft_answers": [],
        "loop_count": 0,
        "confidence_level": 0.0,
        "is_sufficient": False,
        "execution_metadata": {"nodes_visited": []}
    }

    with patch("backend.app.rag.graph.nodes.LangChainFactory.get_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=[
            MagicMock(content="complex"), # analyze_intent
            MagicMock(content="query variants"), # build_query_context loop 0
            MagicMock(content="insufficient"), # reflect_and_decide loop 0 -> increments loop_count to 1
            MagicMock(content="refined query"), # build_query_context loop 1
            MagicMock(content="Some result"), # generate_answer
        ])
        mock_get_llm.return_value = mock_llm
        
        with patch("backend.app.rag.rag_service.rag_service.search") as mock_search:
            mock_search.return_value = []
            
            final_state = await rag_executor.ainvoke(initial_state)
            
            # Should have stopped after 1 loop despite being 'insufficient'
            assert final_state["loop_count"] == 1
            assert final_state["is_sufficient"] is True # Forced True by max_loops logic for exit

@pytest.mark.asyncio
async def test_langgraph_empty_retrieval():
    """Verify that the graph handles empty retrieval results gracefully."""
    from unittest.mock import AsyncMock
    settings = RuntimeSettings(mode=ExecutionMode.FAST)
    initial_state = {
        "query": "Something non-existent",
        "workspace_id": "test-ws",
        "settings": settings,
        "generated_queries": [],
        "retrieved_results": [],
        "blended_context": None,
        "final_context": None,
        "draft_answers": [],
        "loop_count": 0,
        "confidence_level": 0.0,
        "is_sufficient": False,
        "execution_metadata": {"nodes_visited": []}
    }

    with patch("backend.app.rag.graph.nodes.LangChainFactory.get_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="I don't know."))
        mock_get_llm.return_value = mock_llm
        
        with patch("backend.app.rag.rag_service.rag_service.search") as mock_search:
            mock_search.return_value = [] # Empty results
            
            final_state = await rag_executor.ainvoke(initial_state)
            
            assert final_state["final_context"] == ""
            assert "I don't know" in final_state["draft_answers"][0]
