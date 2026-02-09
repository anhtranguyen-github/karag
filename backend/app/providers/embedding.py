from langchain_openai import OpenAIEmbeddings
from langchain_voyageai import VoyageAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_ollama import OllamaEmbeddings
from backend.app.core.config import ai_settings
from backend.app.core.settings_manager import settings_manager
from typing import Optional

async def get_embeddings(workspace_id: Optional[str] = None):
    """Factory to get the configured Embedding provider for a specific workspace."""
    settings = await settings_manager.get_settings(workspace_id)
    provider = settings.embedding_provider.lower()
    model = settings.embedding_model
    
    if provider == "openai":
        return OpenAIEmbeddings(
            model=model,
            api_key=ai_settings.OPENAI_API_KEY
        )
    elif provider == "voyage":
        return VoyageAIEmbeddings(
            model=model,
            voyage_api_key=ai_settings.VOYAGE_API_KEY
        )
    elif provider == "local":
        return HuggingFaceEmbeddings(
            model_name=model
        )
    elif provider == "ollama":
        return OllamaEmbeddings(
            model=model,
            base_url=ai_settings.OLLAMA_BASE_URL
        )
    elif provider == "vllm":
        return OpenAIEmbeddings(
            model=model,
            api_key="EMPTY",
            base_url=ai_settings.VLLM_BASE_URL
        )
    elif provider == "llama-cpp":
        return OpenAIEmbeddings(
            model=model,
            api_key="EMPTY",
            base_url=ai_settings.LLAMACPP_BASE_URL
        )
    else:
        raise ValueError(f"Unsupported Embedding provider: {provider}")
