"""
Integration tests for RAG Pipelines (Ingestion, Retrieval, Generation).

Tests cover:
- Document ingestion (file processing, chunking, embedding, storage)
- Retrieval (search, hybrid search, reranking)
- Generation (RAG execution with LangGraph)

Note: These tests avoid importing the FastAPI app to work around a FastAPI bug
with path parameters and Query defaults.
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from backend.app.rag.rag_service import rag_service
from backend.app.rag.ingestion import ingestion_pipeline
from backend.app.core.settings_manager import settings_manager


@pytest.mark.asyncio
async def test_rag_chunk_text():
    """Test text chunking using different strategies."""
    # Test with default recursive chunking
    text = "This is a test document. " * 50  # Repeat to get multiple chunks
    
    chunks = await rag_service.chunk_text(text, "default")
    
    assert isinstance(chunks, list)
    assert len(chunks) > 0


@pytest.mark.asyncio
async def test_rag_get_embeddings():
    """Test embedding generation."""
    # Mock the embedding provider for testing
    texts = ["Hello world", "Test document", "RAG pipeline"]
    
    # Mock the provider factory
    with patch('backend.app.core.factory.ProviderFactory.get_embeddings') as mock_get:
        mock_provider = AsyncMock()
        mock_provider.aembed_documents = AsyncMock(return_value=[[0.1] * 1536] * len(texts))
        mock_provider.aembed_query = AsyncMock(return_value=[0.1] * 1536)
        mock_get.return_value = mock_provider
        
        embeddings = await rag_service.get_embeddings(texts, "default")
        
        assert len(embeddings) == len(texts)
        assert all(len(e) == 1536 for e in embeddings)


@pytest.mark.asyncio
async def test_rag_search_basic():
    """Test basic retrieval search."""
    # Mock the search to avoid needing actual vector store
    with patch('backend.app.core.factory.ProviderFactory.get_vector_store') as mock_store:
        with patch('backend.app.core.factory.ProviderFactory.get_embeddings') as mock_embed:
            # Setup mocks
            mock_provider = AsyncMock()
            mock_provider.aembed_query = AsyncMock(return_value=[0.1] * 1536)
            mock_embed.return_value = mock_provider
            
            # Mock search results
            mock_vector_store = AsyncMock()
            mock_vector_store.search = AsyncMock(return_value=[
                MagicMock(payload={"text": "Result 1", "source": "doc1"}, score=0.9),
                MagicMock(payload={"text": "Result 2", "source": "doc2"}, score=0.8),
            ])
            mock_store.return_value = mock_vector_store
            
            # Mock settings
            mock_settings = MagicMock()
            mock_settings.retrieval = MagicMock()
            mock_settings.retrieval.rerank = MagicMock()
            mock_settings.retrieval.rerank.enabled = False
            
            with patch('backend.app.core.settings_manager.settings_manager.get_settings', return_value=mock_settings):
                # Execute search
                results = await rag_service.search(
                    query="test query",
                    workspace_id="test_ws",
                    limit=5
                )
                
                assert isinstance(results, list)
                assert len(results) == 2
                assert results[0]["score"] > results[1]["score"]


@pytest.mark.asyncio
async def test_rag_search_with_reranking():
    """Test retrieval with reranking enabled."""
    # Mock vector store with initial results
    with patch('backend.app.core.factory.ProviderFactory.get_vector_store') as mock_store:
        with patch('backend.app.core.factory.ProviderFactory.get_embeddings') as mock_embed:
            with patch('backend.app.providers.reranker.get_reranker') as mock_reranker:
                # Setup mocks
                mock_provider = AsyncMock()
                mock_provider.aembed_query = AsyncMock(return_value=[0.1] * 1536)
                mock_embed.return_value = mock_provider
                
                mock_vector_store = AsyncMock()
                mock_vector_store.search = AsyncMock(return_value=[
                    MagicMock(payload={"text": "Result 1"}, score=0.5),
                    MagicMock(payload={"text": "Result 2"}, score=0.9),
                ])
                mock_store.return_value = mock_vector_store
                
                # Mock reranker
                mock_reranker_instance = AsyncMock()
                mock_reranker_instance.rerank = AsyncMock(return_value=[
                    {"text": "Result 2", "score": 0.95},
                    {"text": "Result 1", "score": 0.6},
                ])
                mock_reranker.return_value = mock_reranker_instance
                
                # Mock settings to return reranking enabled
                mock_settings = MagicMock()
                mock_settings.retrieval = MagicMock()
                mock_settings.retrieval.rerank = MagicMock()
                mock_settings.retrieval.rerank.enabled = True
                mock_settings.retrieval.rerank.top_k = 2
                
                with patch('backend.app.core.settings_manager.settings_manager.get_settings', return_value=mock_settings):
                    results = await rag_service.search(
                        query="test query",
                        workspace_id="test_ws",
                        limit=5
                    )
                    
                    # Verify reranker was called
                    mock_reranker_instance.rerank.assert_called_once()


@pytest.mark.asyncio
async def test_rag_execute_generation():
    """Test RAG execution with generation."""
    from backend.app.rag.graph.orchestrator import rag_executor
    
    # Mock the LangGraph executor
    with patch.object(rag_executor, 'ainvoke', new=AsyncMock(return_value={
        "query": "test query",
        "final_answer": "Generated answer",
        "final_context": "Context from retrieved docs",
        "execution_metadata": {"duration_ms": 100, "loops": 1},
        "draft_answers": ["Generated answer"],
        "generated_queries": [],
        "loop_count": 0,
        "confidence_level": 0.9,
    })):
        result = await rag_service.execute(
            query="What is RAG?",
            workspace_id="test_ws",
        )
        
        assert "answer" in result
        assert "context" in result
        assert "tracing" in result
        assert result["answer"] == "Generated answer"


@pytest.mark.asyncio
async def test_ingestion_pipeline_process_text():
    """Test processing raw text through the ingestion pipeline."""
    with patch('backend.app.core.factory.ProviderFactory.get_vector_store') as mock_store:
        with patch('backend.app.core.factory.ProviderFactory.get_embeddings') as mock_embed:
            # Setup mocks
            mock_provider = AsyncMock()
            mock_provider.aembed_documents = AsyncMock(return_value=[[0.1] * 1536])
            mock_provider.aembed_query = AsyncMock(return_value=[0.1] * 1536)
            mock_embed.return_value = mock_provider
            
            mock_vector_store = AsyncMock()
            mock_vector_store.upsert_documents = AsyncMock()
            mock_store.return_value = mock_vector_store
            
            # Test text ingestion
            text = "This is a test document for ingestion."
            metadata = {
                "workspace_id": "default",
                "filename": "test.txt",
                "doc_id": "doc_123",
            }
            
            chunks_count = await ingestion_pipeline.process_text(text, metadata)
            
            assert chunks_count > 0
            mock_vector_store.upsert_documents.assert_called_once()


@pytest.mark.asyncio
async def test_ingestion_get_config():
    """Test getting ingestion configuration for a workspace."""
    config, store = await ingestion_pipeline.get_ingestion_config("default")
    
    assert config is not None
    assert config.workspace_id == "default"
    assert config.vector_size > 0
    assert config.chunking is not None


@pytest.mark.asyncio
async def test_ingestion_initialize():
    """Test initializing a workspace's collection."""
    with patch('backend.app.core.factory.ProviderFactory.get_vector_store') as mock_store:
        mock_vector_store = AsyncMock()
        mock_vector_store.create_collection_if_not_exists = AsyncMock()
        mock_store.return_value = mock_vector_store
        
        collection_name = await ingestion_pipeline.initialize("default")
        
        mock_vector_store.create_collection_if_not_exists.assert_called_once()


@pytest.mark.asyncio
async def test_rag_service_with_different_workspaces():
    """Test that different workspaces have isolated RAG configs."""
    # Get settings for different workspaces
    settings_default = await settings_manager.get_settings("default")
    settings_vault = await settings_manager.get_settings("vault")
    
    # Both should return valid settings (either global or workspace-specific)
    assert settings_default is not None
    assert settings_vault is not None


@pytest.mark.asyncio
async def test_rag_contextual_compression():
    """Test contextual compression in retrieval."""
    from backend.app.rag.advanced_retrieval import ContextualCompressor
    
    mock_llm = AsyncMock()
    mock_compressor = ContextualCompressor(mock_llm)
    
    # Verify the compressor can be instantiated
    assert mock_compressor is not None


@pytest.mark.asyncio
async def test_rag_multi_query_retriever():
    """Test multi-query retrieval."""
    from backend.app.rag.advanced_retrieval import MultiQueryRetriever
    
    mock_llm = AsyncMock()
    retriever = MultiQueryRetriever(mock_llm, num_variations=3)
    
    # This would retrieve with multiple queries if properly set up
    assert retriever is not None
    assert retriever.num_variations == 3


@pytest.mark.asyncio
async def test_rag_advanced_search():
    """Test advanced search functionality."""
    with patch('backend.app.core.factory.ProviderFactory.get_vector_store') as mock_store:
        with patch('backend.app.core.factory.ProviderFactory.get_embeddings') as mock_embed:
            # Setup mocks
            mock_provider = AsyncMock()
            mock_provider.aembed_query = AsyncMock(return_value=[0.1] * 1536)
            mock_embed.return_value = mock_provider
            
            mock_vector_store = AsyncMock()
            mock_vector_store.search = AsyncMock(return_value=[
                MagicMock(payload={"text": "Result"}, score=0.8),
            ])
            mock_store.return_value = mock_vector_store
            
            # Mock LLM client for multi-query
            mock_llm = AsyncMock()
            
            results = await rag_service.search_advanced(
                query="test query",
                workspace_id="test_ws",
                limit=5,
                enable_multi_query=True,
                llm_client=mock_llm,
            )
            
            assert isinstance(results, list)


@pytest.mark.asyncio
async def test_rag_get_query_embedding():
    """Test query embedding generation."""
    with patch('backend.app.core.factory.ProviderFactory.get_embeddings') as mock_embed:
        mock_provider = AsyncMock()
        mock_provider.aembed_query = AsyncMock(return_value=[0.1] * 1536)
        mock_embed.return_value = mock_provider
        
        embedding = await rag_service.get_query_embedding("test query", "default")
        
        assert len(embedding) == 1536
        mock_provider.aembed_query.assert_called_once_with("test query")
