import pytest
import asyncio
from pydantic import TypeAdapter
from backend.app.rag.chunking.registry import chunking_registry
from backend.app.schemas.chunking import ChunkingConfig
from backend.app.schemas.generation import GenerationConfig
from backend.app.schemas.retrieval import RetrievalConfig
from backend.app.schemas.execution import RuntimeSettings, ExecutionMode

def test_chunking_strategies():
    """Verify registry supports all strategies."""
    from backend.app.schemas.chunking import RecursiveChunkingConfig, SemanticChunkingConfig
    text = "Hello world. This is a test."
    
    # Character
    config = RecursiveChunkingConfig(strategy="recursive")
    chunks = asyncio.run(chunking_registry.chunk_text(text, config))
    assert len(chunks) > 0
    
    # Semantic (Mocked/Simplified check)
    config = SemanticChunkingConfig(strategy="semantic")
    # Note: actual semantic might need models, here we check registration
    assert "semantic" in chunking_registry._chunkers

def test_generation_config_union():
    """Verify Pydantic union for GenerationConfig works correctly."""
    adapter = TypeAdapter(GenerationConfig)
    
    # OpenAI
    openai_json = {
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.5
    }
    config = adapter.validate_python(openai_json)
    assert config.provider == "openai"
    
    # Llama
    llama_json = {
        "provider": "llama",
        "model": "llama-3-8b-instruct",
    }
    config = adapter.validate_python(llama_json)
    assert config.provider == "llama"

def test_retrieval_config_defaults():
    """Verify RetrievalConfig defaults and structure."""
    config = RetrievalConfig()
    assert config.vector.enabled is True
    assert config.rerank.enabled is False
    assert config.graph.enabled is False
    
    # Custom
    config = RetrievalConfig(
        rerank={"enabled": True, "provider": "cohere"},
        graph={"enabled": True}
    )
    assert config.rerank.enabled is True
    assert config.graph.enabled is True

def test_execution_schemas():
    """Verify ExecutionMode and RuntimeSettings."""
    settings = RuntimeSettings(mode=ExecutionMode.DEEP)
    assert settings.mode == "deep"
    
    fast = RuntimeSettings(mode=ExecutionMode.FAST)
    assert fast.fast.max_loops == 1
