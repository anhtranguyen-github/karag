"""Factory for creating provider instances.

This module creates LangChain models internally and wraps them in
provider-agnostic adapters. It serves as the bridge between configuration
schemas and runtime provider instances.
"""

from typing import Optional

import structlog

from backend.app.core.config import karag_settings
from backend.app.core.settings_manager import settings_manager
from backend.app.providers.adapter import LangChainAdapter
from backend.app.providers.base import LLMProvider
from backend.app.providers.embedding import EmbeddingProvider, LangChainEmbeddingAdapter
from backend.app.schemas.embedding import EmbeddingConfig
from backend.app.schemas.generation import GenerationConfig

logger = structlog.get_logger(__name__)


class ProviderFactory:
    """Factory for creating provider instances.
    
    This factory translates domain schemas into LangChain infrastructure objects,
    then wraps them in provider-agnostic adapters.
    """

    @staticmethod
    async def get_llm(workspace_id: Optional[str] = None) -> LLMProvider:
        """Get LLM provider for workspace.
        
        Creates a LangChain model internally based on workspace settings,
        wraps it in a LangChainAdapter, and returns the LLMProvider interface.
        
        Args:
            workspace_id: Optional workspace identifier for settings
            
        Returns:
            LLMProvider implementation
        """
        settings = await settings_manager.get_settings(workspace_id)
        config: GenerationConfig = settings.generation

        base_kwargs = {
            "temperature": config.temperature,
            "max_tokens": config.max_output_tokens,
            "streaming": config.streaming,
        }

        # Use string comparison for more robust dispatching
        provider = config.provider

        # Import LangChain models internally
        if provider == "openai":
            from langchain_openai import ChatOpenAI
            
            llm = ChatOpenAI(
                model=config.model,
                api_key=karag_settings.OPENAI_API_KEY,
                presence_penalty=getattr(config, "presence_penalty", 0.0),
                frequency_penalty=getattr(config, "frequency_penalty", 0.0),
                **base_kwargs,
            )
        elif provider == "azure":
            from langchain_openai import AzureChatOpenAI
            
            llm = AzureChatOpenAI(
                azure_deployment=getattr(config, "deployment_name", ""),
                openai_api_version=getattr(config, "api_version", ""),
                api_key=karag_settings.AZURE_OPENAI_API_KEY,
                **base_kwargs,
            )
        elif provider in ["llama", "ollama", "local"]:
            from langchain_ollama import ChatOllama
            
            llm = ChatOllama(
                model=config.model,
                base_url=karag_settings.OLLAMA_BASE_URL,
                **base_kwargs,
            )
        else:
            logger.error(
                "unsupported_llm_provider",
                provider=provider,
                config_type=type(config).__name__,
            )
            raise ValueError(f"Unsupported LLM provider in schema: {provider}")

        # Wrap in adapter and return
        return LangChainAdapter(
            llm=llm,
            provider_name=provider,
            model_name=config.model,
        )

    @staticmethod
    async def get_embeddings(workspace_id: Optional[str] = None) -> EmbeddingProvider:
        """Get embedding provider for workspace.
        
        Creates a LangChain embeddings model internally based on workspace settings,
        wraps it in a LangChainEmbeddingAdapter, and returns the EmbeddingProvider interface.
        
        Args:
            workspace_id: Optional workspace identifier for settings
            
        Returns:
            EmbeddingProvider implementation
        """
        settings = await settings_manager.get_settings(workspace_id)
        config: EmbeddingConfig = settings.embedding
        
        # Access the underlying implementation from the wrapper
        impl = config.dense
        provider = impl.provider

        # Import LangChain embeddings internally
        if provider == "openai":
            from langchain_openai import OpenAIEmbeddings
            
            embeddings = OpenAIEmbeddings(
                model=impl.model,
                api_key=karag_settings.OPENAI_API_KEY,
            )
        elif provider == "azure":
            from langchain_openai import AzureOpenAIEmbeddings
            
            embeddings = AzureOpenAIEmbeddings(
                azure_deployment=getattr(impl, "deployment_name", ""),
                openai_api_version=getattr(impl, "api_version", ""),
                api_key=karag_settings.AZURE_OPENAI_API_KEY,
            )
        elif provider == "voyage":
            from langchain_voyageai import VoyageAIEmbeddings
            
            embeddings = VoyageAIEmbeddings(
                model=impl.model,
                voyage_api_key=karag_settings.VOYAGE_API_KEY,
            )
        elif provider == "huggingface":
            from langchain_community.embeddings import HuggingFaceEmbeddings
            
            embeddings = HuggingFaceEmbeddings(
                model_name=impl.model,
                model_kwargs={"device": getattr(impl, "device", "cpu")},
                encode_kwargs={"normalize_embeddings": getattr(impl, "normalize_embeddings", True)},
            )
        elif provider == "ollama":
            from langchain_ollama import OllamaEmbeddings
            
            embeddings = OllamaEmbeddings(
                model=impl.model,
                base_url=karag_settings.OLLAMA_BASE_URL,
            )
        elif provider == "cohere":
            from langchain_cohere import CohereEmbeddings
            
            embeddings = CohereEmbeddings(
                model=impl.model,
                cohere_api_key=getattr(karag_settings, "COHERE_API_KEY", None),
            )
        else:
            logger.error(
                "unsupported_embedding_provider",
                provider=provider,
                impl_type=type(impl).__name__,
            )
            raise ValueError(f"Unsupported Embedding provider in schema: {provider}")

        # Wrap in adapter and return
        return LangChainEmbeddingAdapter(
            embeddings=embeddings,
            provider_name=provider,
            model_name=impl.model,
        )

    @staticmethod
    async def get_vector_store(workspace_id: Optional[str] = None):
        """Returns the appropriate VectorStore implementation.
        
        Currently defaults to QdrantStore.
        """
        from backend.app.rag.store.qdrant import QdrantStore

        # Here we could switch based on configuration if we had multiple providers
        return QdrantStore()

    @staticmethod
    async def get_graph_store(workspace_id: Optional[str] = None):
        """Returns the appropriate GraphStore implementation.
        
        Currently defaults to Neo4jStore.
        """
        from backend.app.rag.store.neo4j_store import Neo4jStore

        # Like VectorStore, this can switch implementations based on settings
        return Neo4jStore()
