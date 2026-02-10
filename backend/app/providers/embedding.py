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
    settings = await settings_manager.get_settings(workspace_id)
    provider = settings.embedding_provider.lower()
    model = settings.embedding_model

    with tracer.start_as_current_span(
        "embedding.resolve_provider",
        attributes={
            "embedding.provider": provider,
            "embedding.model": model,
            "embedding.dimension": settings.embedding_dim,
            "workspace_id": workspace_id or "default",
        },
    ):
        start = time.perf_counter()

        logger.info(
            "embedding_provider_resolved",
            provider=provider,
            model=model,
            workspace_id=workspace_id or "default",
        )

        if provider == "openai":
            emb = OpenAIEmbeddings(
                model=model,
                api_key=ai_settings.OPENAI_API_KEY,
            )
        elif provider == "voyage":
            emb = VoyageAIEmbeddings(
                model=model,
                voyage_api_key=ai_settings.VOYAGE_API_KEY,
            )
        elif provider == "local":
            emb = HuggingFaceEmbeddings(model_name=model)
        elif provider == "ollama":
            emb = OllamaEmbeddings(
                model=model,
                base_url=ai_settings.OLLAMA_BASE_URL,
            )
        elif provider == "vllm":
            emb = OpenAIEmbeddings(
                model=model,
                api_key="EMPTY",
                base_url=ai_settings.VLLM_BASE_URL,
            )
        elif provider == "llama-cpp":
            emb = OpenAIEmbeddings(
                model=model,
                api_key="EMPTY",
                base_url=ai_settings.LLAMACPP_BASE_URL,
            )
        else:
            raise ValueError(f"Unsupported Embedding provider: {provider}")

        duration = time.perf_counter() - start
        EMBEDDING_REQUEST_LATENCY.labels(provider=provider).observe(duration)
        LLM_REQUEST_COUNT.labels(
            provider=f"emb:{provider}", operation="init", status="ok"
        ).inc()

        return emb
