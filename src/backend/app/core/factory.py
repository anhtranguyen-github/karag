"""Provider factory backed by registries.

The factory keeps the existing call sites stable while delegating provider
selection to modular registries. New providers can be registered without
editing this module.
"""

import os

import structlog
from src.backend.app.config import settings_manager
from src.backend.app.providers.base import LLMProvider
from src.backend.app.providers.embedding import EmbeddingProvider
from src.backend.app.providers.registry import (
    embedding_registry,
    graph_store_registry,
    llm_registry,
    vector_store_registry,
)

logger = structlog.get_logger(__name__)


class ProviderFactory:
    """Factory for creating provider instances.

    This factory translates domain schemas into LangChain infrastructure objects,
    then wraps them in provider-agnostic adapters.
    """

    @staticmethod
    async def get_llm(workspace_id: str | None = None) -> LLMProvider:
        """Get the configured LLM provider for a workspace."""
        settings = await settings_manager.get_settings(workspace_id)
        provider_name = settings.generation.provider
        logger.debug("provider_resolve_llm", provider=provider_name, workspace_id=workspace_id)
        return await llm_registry.build(provider_name, workspace_id)

    @staticmethod
    async def get_embeddings(workspace_id: str | None = None) -> EmbeddingProvider:
        """Get the configured embedding provider for a workspace."""
        settings = await settings_manager.get_settings(workspace_id)
        provider_name = settings.embedding.provider
        logger.debug("provider_resolve_embedding", provider=provider_name, workspace_id=workspace_id)
        return await embedding_registry.build(provider_name, workspace_id)

    @staticmethod
    async def get_vector_store(workspace_id: str | None = None):
        """Return the configured vector store implementation."""
        provider_name = os.getenv("VECTOR_STORE_PROVIDER", "qdrant")
        logger.debug("provider_resolve_vector_store", provider=provider_name, workspace_id=workspace_id)
        return await vector_store_registry.build(provider_name, workspace_id)

    @staticmethod
    async def get_graph_store(workspace_id: str | None = None):
        """Return the configured graph store implementation."""
        provider_name = os.getenv("GRAPH_STORE_PROVIDER", "neo4j")
        logger.debug("provider_resolve_graph_store", provider=provider_name, workspace_id=workspace_id)
        return await graph_store_registry.build(provider_name, workspace_id)
