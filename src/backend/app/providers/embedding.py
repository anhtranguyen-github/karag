"""Embedding provider abstraction layer.

This module defines the interface for embedding providers and provides
a LangChain-based adapter implementation.
"""

from abc import ABC, abstractmethod
from typing import Any

import structlog

from src.backend.app.core.telemetry import get_tracer

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class EmbeddingProvider(ABC):
    """Minimal interface for embedding providers.

    This abstraction isolates the application from specific embedding
    implementations, allowing for provider switching without code changes.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider identifier (e.g., 'openai', 'azure', 'huggingface')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the model identifier."""
        pass

    @property
    @abstractmethod
    def dimensions(self) -> int:
        """Return the embedding vector dimensions."""
        pass

    @abstractmethod
    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of documents.

        Args:
            texts: List of text documents to embed

        Returns:
            List of embedding vectors (one per document)
        """
        pass

    @abstractmethod
    async def embed_query(self, text: str) -> list[float]:
        """Embed a query text.

        Args:
            text: Query text to embed

        Returns:
            Embedding vector for the query
        """
        pass


class LangChainEmbeddingAdapter(EmbeddingProvider):
    """Adapter wrapping LangChain embedding models.

    All LangChain-specific logic is contained within this class.
    """

    def __init__(
        self,
        embeddings: Any,  # LangChain Embeddings instance
        provider_name: str,
        model_name: str | None = None,
        dimensions: int | None = None,
    ):
        """Initialize the adapter.

        Args:
            embeddings: LangChain Embeddings instance
            provider_name: Identifier for the provider
            model_name: Model identifier (extracted if not provided)
            dimensions: Embedding dimensions (extracted if not provided)
        """
        self._embeddings = embeddings
        self._provider_name = provider_name
        self._model_name = model_name or self._extract_model_name(embeddings)
        self._dimensions = dimensions or self._extract_dimensions(embeddings)

    def _extract_model_name(self, embeddings: Any) -> str:
        """Extract model name from LangChain embeddings."""
        for attr in ["model", "model_name", "model_id"]:
            if hasattr(embeddings, attr):
                value = getattr(embeddings, attr)
                if value:
                    return str(value)
        return "unknown"

    def _extract_dimensions(self, embeddings: Any) -> int:
        """Extract dimensions from LangChain embeddings."""
        # Try to get dimensions from various attributes
        for attr in ["embedding_dimension", "dimensions", "vector_size"]:
            if hasattr(embeddings, attr):
                value = getattr(embeddings, attr)
                if value:
                    return int(value)

        # Try to infer from the model name
        model_name = self._model_name.lower()
        dimension_map = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
            "voyage-3": 1024,
            "voyage-3-lite": 512,
            "voyage-2": 1024,
            "all-minilm": 384,
            "bge-small": 384,
            "bge-base": 768,
            "bge-large": 1024,
        }

        for key, dim in dimension_map.items():
            if key in model_name:
                return dim

        # Default fallback
        logger.warning(
            "unknown_embedding_dimensions",
            provider=self._provider_name,
            model=self._model_name,
        )
        return 1536  # Common default

    @property
    def provider_name(self) -> str:
        """Return the provider identifier."""
        return self._provider_name

    @property
    def model_name(self) -> str:
        """Return the model identifier."""
        return self._model_name

    @property
    def dimensions(self) -> int:
        """Return the embedding vector dimensions."""
        return self._dimensions

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of documents."""
        if not texts:
            return []

        try:
            # LangChain's aembed_documents is async
            if hasattr(self._embeddings, "aembed_documents"):
                return await self._embeddings.aembed_documents(texts)
            else:
                # Fallback to sync method in thread pool
                import asyncio

                return await asyncio.get_event_loop().run_in_executor(None, self._embeddings.embed_documents, texts)
        except Exception as e:
            logger.error(
                "embed_documents_failed",
                provider=self._provider_name,
                model=self._model_name,
                num_texts=len(texts),
                error=str(e),
            )
            raise

    async def embed_query(self, text: str) -> list[float]:
        """Embed a query text."""
        if not text:
            return [0.0] * self._dimensions

        try:
            # LangChain's aembed_query is async
            if hasattr(self._embeddings, "aembed_query"):
                return await self._embeddings.aembed_query(text)
            else:
                # Fallback to sync method in thread pool
                import asyncio

                return await asyncio.get_event_loop().run_in_executor(None, self._embeddings.embed_query, text)
        except Exception as e:
            logger.error(
                "embed_query_failed",
                provider=self._provider_name,
                model=self._model_name,
                error=str(e),
            )
            raise


# Legacy compatibility - factory function
async def get_embeddings(workspace_id: str | None = None) -> EmbeddingProvider:
    """Factory function to get the configured embedding provider.

    This is the legacy entry point that now returns the new abstraction.
    """
    from src.backend.app.core.factory import ProviderFactory

    return await ProviderFactory.get_embeddings(workspace_id)
