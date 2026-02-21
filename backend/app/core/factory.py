import structlog
from typing import Optional
from langchain_openai import (
    ChatOpenAI,
    OpenAIEmbeddings,
    AzureChatOpenAI,
    AzureOpenAIEmbeddings,
)
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_voyageai import VoyageAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import AsyncQdrantClient
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.embeddings import Embeddings
from langchain_core.retrievers import BaseRetriever

from backend.app.core.config import ai_settings
from backend.app.core.settings_manager import settings_manager
from backend.app.schemas.embedding import (
    EmbeddingConfig,
    OpenAIEmbeddingConfig,
    AzureOpenAIEmbeddingConfig,
    VoyageEmbeddingConfig,
    HuggingFaceEmbeddingConfig,
    OllamaEmbeddingConfig,
)
from backend.app.schemas.generation import (
    GenerationConfig,
    OpenAIGenerationConfig,
    AzureOpenAIGenerationConfig,
    LlamaGenerationConfig,
    CDP2GenerationConfig,
    VLMGenerationConfig,
)
from backend.app.schemas.retrieval import RetrievalConfig

logger = structlog.get_logger(__name__)


class LangChainFactory:
    """
    Thin adapter layer translating domain schemas into LangChain infrastructure objects.
    Logic is strictly mapping-based; no orchestration or branching lives here.
    """

    @staticmethod
    async def get_llm(workspace_id: Optional[str] = None) -> BaseChatModel:
        settings = await settings_manager.get_settings(workspace_id)
        config: GenerationConfig = settings.generation

        base_kwargs = {
            "temperature": config.temperature,
            "max_tokens": config.max_output_tokens,
            "streaming": config.streaming,
        }

        if isinstance(config, OpenAIGenerationConfig):
            model = ChatOpenAI(
                model=config.model,
                api_key=ai_settings.OPENAI_API_KEY,
                presence_penalty=config.presence_penalty,
                frequency_penalty=config.frequency_penalty,
                **base_kwargs,
            )
        elif isinstance(config, AzureOpenAIGenerationConfig):
            model = AzureChatOpenAI(
                azure_deployment=config.deployment_name,
                openai_api_version=config.api_version,
                api_key=ai_settings.AZURE_OPENAI_API_KEY,
                **base_kwargs,
            )
        elif isinstance(
            config, (LlamaGenerationConfig, CDP2GenerationConfig, VLMGenerationConfig)
        ):
            # Local models are routed through Ollama to reduce custom protocol code
            model = ChatOllama(
                model=config.model, base_url=ai_settings.OLLAMA_BASE_URL, **base_kwargs
            )
        else:
            raise ValueError(f"Unsupported LLM provider in schema: {config.provider}")

        return model

    @staticmethod
    async def get_embeddings(workspace_id: Optional[str] = None) -> Embeddings:
        settings = await settings_manager.get_settings(workspace_id)
        config: EmbeddingConfig = settings.embedding

        if isinstance(config, OpenAIEmbeddingConfig):
            return OpenAIEmbeddings(
                model=config.model,
                api_key=ai_settings.OPENAI_API_KEY,
            )
        elif isinstance(config, AzureOpenAIEmbeddingConfig):
            return AzureOpenAIEmbeddings(
                azure_deployment=config.deployment_name,
                openai_api_version=config.api_version,
                api_key=ai_settings.AZURE_OPENAI_API_KEY,
            )
        elif isinstance(config, VoyageEmbeddingConfig):
            return VoyageAIEmbeddings(
                model=config.model,
                voyage_api_key=ai_settings.VOYAGE_API_KEY,
            )
        elif isinstance(config, HuggingFaceEmbeddingConfig):
            return HuggingFaceEmbeddings(
                model_name=config.model,
                model_kwargs={"device": config.device},
                encode_kwargs={"normalize_embeddings": config.normalize_embeddings},
            )
        elif isinstance(config, OllamaEmbeddingConfig):
            return OllamaEmbeddings(
                model=config.model,
                base_url=ai_settings.OLLAMA_BASE_URL,
            )
        else:
            raise ValueError(
                f"Unsupported Embedding provider in schema: {config.provider}"
            )

    @staticmethod
    async def get_vector_store(workspace_id: Optional[str] = None):
        """
        Returns the appropriate VectorStore implementation.
        Currently defaults to QdrantStore.
        """
        from backend.app.rag.store.qdrant import QdrantStore
        # Here we could switch based on configuration if we had multiple providers
        return QdrantStore()
