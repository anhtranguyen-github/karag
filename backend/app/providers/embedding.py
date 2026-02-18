import time

import structlog
from langchain_openai import OpenAIEmbeddings
from langchain_voyageai import VoyageAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_ollama import OllamaEmbeddings
from backend.app.core.config import ai_settings
from backend.app.core.settings_manager import settings_manager
from backend.app.core.telemetry import (
    get_tracer,
    EMBEDDING_REQUEST_LATENCY,
    LLM_REQUEST_COUNT,
)
from typing import Optional

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


async def get_embeddings(workspace_id: Optional[str] = None):
    """Factory to get the configured Embedding provider for a specific workspace."""
    from backend.app.schemas.embedding import (
        OpenAIEmbeddingConfig, AzureOpenAIEmbeddingConfig, VoyageEmbeddingConfig,
        CohereEmbeddingConfig, HuggingFaceEmbeddingConfig, OllamaEmbeddingConfig,
        LlamaEmbeddingConfig, CDP2EmbeddingConfig, VLMEmbeddingConfig
    )
    
    settings = await settings_manager.get_settings(workspace_id)
    config = settings.embedding
    provider_type = config.provider

    with tracer.start_as_current_span(
        "embedding.resolve_provider",
        attributes={
            "embedding.provider": provider_type,
            "embedding.model": config.model,
            "embedding.dimensions": config.dimensions,
            "workspace_id": workspace_id or "default",
        },
    ):
        start = time.perf_counter()

        logger.info(
            "embedding_provider_resolved",
            provider=provider_type,
            model=config.model,
            workspace_id=workspace_id or "default",
        )

        if isinstance(config, OpenAIEmbeddingConfig):
            emb = OpenAIEmbeddings(
                model=config.model,
                api_key=ai_settings.OPENAI_API_KEY,
            )
        elif isinstance(config, AzureOpenAIEmbeddingConfig):
            from langchain_openai import AzureOpenAIEmbeddings
            emb = AzureOpenAIEmbeddings(
                azure_deployment=config.deployment_name,
                openai_api_version=config.api_version,
                api_key=ai_settings.AZURE_OPENAI_API_KEY,
            )
        elif isinstance(config, VoyageEmbeddingConfig):
            emb = VoyageAIEmbeddings(
                model=config.model,
                voyage_api_key=ai_settings.VOYAGE_API_KEY,
            )
        elif isinstance(config, CohereEmbeddingConfig):
            from langchain_cohere import CohereEmbeddings
            emb = CohereEmbeddings(
                model=config.model,
                cohere_api_key=ai_settings.COHERE_API_KEY,
            )
        elif isinstance(config, HuggingFaceEmbeddingConfig):
            emb = HuggingFaceEmbeddings(
                model_name=config.model,
                model_kwargs={'device': config.device},
                encode_kwargs={'normalize_embeddings': config.normalize_embeddings}
            )
        elif isinstance(config, OllamaEmbeddingConfig):
            emb = OllamaEmbeddings(
                model=config.model,
                base_url=ai_settings.OLLAMA_BASE_URL,
            )
        else:
            # Fallback for Llama, CDP2, VLM or any other custom handled types
            # For now, if we don't have a direct LC implementation ready, we'll raise or use a generic one
            # The catalog mentioned some local paths, which might need specialized loaders
            raise ValueError(f"Direct implementation for {provider_type} not yet mapped in factory.")

        duration = time.perf_counter() - start
        EMBEDDING_REQUEST_LATENCY.labels(provider=provider_type).observe(duration)
        LLM_REQUEST_COUNT.labels(
            provider=f"emb:{provider_type}", operation="init", status="ok"
        ).inc()

        return emb
