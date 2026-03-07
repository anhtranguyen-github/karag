from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

import structlog

from src.backend.app.core.config import karag_settings
from src.backend.app.core.settings_manager import settings_manager

logger = structlog.get_logger(__name__)

ProviderBuilder = Callable[[str | None], Awaitable[Any]]


@dataclass(slots=True)
class ProviderSpec:
    name: str
    builder: ProviderBuilder
    capabilities: set[str] = field(default_factory=set)
    metadata: dict[str, Any] = field(default_factory=dict)


class ProviderRegistry:
    def __init__(self, kind: str):
        self.kind = kind
        self._providers: dict[str, ProviderSpec] = {}

    def register(
        self,
        name: str,
        builder: ProviderBuilder,
        *,
        capabilities: set[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        key = name.strip().lower()
        self._providers[key] = ProviderSpec(
            name=key,
            builder=builder,
            capabilities=capabilities or set(),
            metadata=metadata or {},
        )

    def has(self, name: str) -> bool:
        return name.strip().lower() in self._providers

    def list(self) -> list[str]:
        return sorted(self._providers.keys())

    async def build(self, name: str, workspace_id: str | None = None) -> Any:
        key = name.strip().lower()
        if key not in self._providers:
            raise ValueError(
                f"Unsupported {self.kind} provider '{name}'. Available: {', '.join(self.list()) or 'none'}"
            )
        return await self._providers[key].builder(workspace_id)


llm_registry = ProviderRegistry("llm")
embedding_registry = ProviderRegistry("embedding")
vector_store_registry = ProviderRegistry("vector_store")
graph_store_registry = ProviderRegistry("graph_store")


async def _build_openai_llm(workspace_id: str | None):
    from langchain_openai import ChatOpenAI

    from src.backend.app.providers.adapter import LangChainAdapter

    settings = await settings_manager.get_settings(workspace_id)
    config = settings.generation
    base_kwargs = {
        "temperature": config.temperature,
        "max_tokens": config.max_output_tokens,
        "streaming": config.streaming,
    }
    llm = ChatOpenAI(
        model=config.model,
        api_key=karag_settings.OPENAI_API_KEY,
        presence_penalty=getattr(config, "presence_penalty", 0.0),
        frequency_penalty=getattr(config, "frequency_penalty", 0.0),
        **base_kwargs,
    )
    return LangChainAdapter(llm=llm, provider_name="openai", model_name=config.model)


async def _build_azure_llm(workspace_id: str | None):
    from langchain_openai import AzureChatOpenAI

    from src.backend.app.providers.adapter import LangChainAdapter

    settings = await settings_manager.get_settings(workspace_id)
    config = settings.generation
    base_kwargs = {
        "temperature": config.temperature,
        "max_tokens": config.max_output_tokens,
        "streaming": config.streaming,
    }
    llm = AzureChatOpenAI(
        azure_deployment=getattr(config, "deployment_name", ""),
        openai_api_version=getattr(config, "api_version", ""),
        api_key=karag_settings.AZURE_OPENAI_API_KEY,
        **base_kwargs,
    )
    return LangChainAdapter(llm=llm, provider_name="azure", model_name=config.model)


async def _build_ollama_llm(workspace_id: str | None):
    from langchain_ollama import ChatOllama

    from src.backend.app.providers.adapter import LangChainAdapter

    settings = await settings_manager.get_settings(workspace_id)
    config = settings.generation
    base_kwargs = {
        "temperature": config.temperature,
        "max_tokens": config.max_output_tokens,
        "streaming": config.streaming,
    }
    llm = ChatOllama(
        model=config.model,
        base_url=karag_settings.OLLAMA_BASE_URL,
        **base_kwargs,
    )
    return LangChainAdapter(llm=llm, provider_name=config.provider, model_name=config.model)


async def _build_openai_embeddings(workspace_id: str | None):
    from langchain_openai import OpenAIEmbeddings

    from src.backend.app.providers.embedding import LangChainEmbeddingAdapter

    settings = await settings_manager.get_settings(workspace_id)
    impl = settings.embedding.dense
    embeddings = OpenAIEmbeddings(model=impl.model, api_key=karag_settings.OPENAI_API_KEY)
    return LangChainEmbeddingAdapter(embeddings=embeddings, provider_name="openai", model_name=impl.model)


async def _build_azure_embeddings(workspace_id: str | None):
    from langchain_openai import AzureOpenAIEmbeddings

    from src.backend.app.providers.embedding import LangChainEmbeddingAdapter

    settings = await settings_manager.get_settings(workspace_id)
    impl = settings.embedding.dense
    embeddings = AzureOpenAIEmbeddings(
        azure_deployment=getattr(impl, "deployment_name", ""),
        openai_api_version=getattr(impl, "api_version", ""),
        api_key=karag_settings.AZURE_OPENAI_API_KEY,
    )
    return LangChainEmbeddingAdapter(embeddings=embeddings, provider_name="azure", model_name=impl.model)


async def _build_voyage_embeddings(workspace_id: str | None):
    from langchain_voyageai import VoyageAIEmbeddings

    from src.backend.app.providers.embedding import LangChainEmbeddingAdapter

    settings = await settings_manager.get_settings(workspace_id)
    impl = settings.embedding.dense
    embeddings = VoyageAIEmbeddings(model=impl.model, voyage_api_key=karag_settings.VOYAGE_API_KEY)
    return LangChainEmbeddingAdapter(embeddings=embeddings, provider_name="voyage", model_name=impl.model)


async def _build_huggingface_embeddings(workspace_id: str | None):
    from langchain_community.embeddings import HuggingFaceEmbeddings

    from src.backend.app.providers.embedding import LangChainEmbeddingAdapter

    settings = await settings_manager.get_settings(workspace_id)
    impl = settings.embedding.dense
    embeddings = HuggingFaceEmbeddings(
        model_name=impl.model,
        model_kwargs={"device": getattr(impl, "device", "cpu")},
        encode_kwargs={"normalize_embeddings": getattr(impl, "normalize_embeddings", True)},
    )
    return LangChainEmbeddingAdapter(embeddings=embeddings, provider_name="huggingface", model_name=impl.model)


async def _build_ollama_embeddings(workspace_id: str | None):
    from langchain_ollama import OllamaEmbeddings

    from src.backend.app.providers.embedding import LangChainEmbeddingAdapter

    settings = await settings_manager.get_settings(workspace_id)
    impl = settings.embedding.dense
    embeddings = OllamaEmbeddings(model=impl.model, base_url=karag_settings.OLLAMA_BASE_URL)
    return LangChainEmbeddingAdapter(embeddings=embeddings, provider_name="ollama", model_name=impl.model)


async def _build_cohere_embeddings(workspace_id: str | None):
    from langchain_cohere import CohereEmbeddings

    from src.backend.app.providers.embedding import LangChainEmbeddingAdapter

    settings = await settings_manager.get_settings(workspace_id)
    impl = settings.embedding.dense
    embeddings = CohereEmbeddings(
        model=impl.model,
        cohere_api_key=getattr(karag_settings, "COHERE_API_KEY", None),
    )
    return LangChainEmbeddingAdapter(embeddings=embeddings, provider_name="cohere", model_name=impl.model)


async def _build_qdrant_store(_: str | None):
    from src.backend.app.rag.store.qdrant import QdrantStore

    return QdrantStore()


async def _build_neo4j_store(_: str | None):
    from src.backend.app.rag.store.neo4j_store import Neo4jStore

    return Neo4jStore()


def register_default_providers() -> None:
    if llm_registry.list():
        return

    llm_registry.register("openai", _build_openai_llm, capabilities={"chat", "stream"})
    llm_registry.register("azure", _build_azure_llm, capabilities={"chat", "stream"})
    llm_registry.register("ollama", _build_ollama_llm, capabilities={"chat", "stream", "local"})
    llm_registry.register("local", _build_ollama_llm, capabilities={"chat", "stream", "local"})
    llm_registry.register("llama", _build_ollama_llm, capabilities={"chat", "stream", "local"})

    embedding_registry.register("openai", _build_openai_embeddings, capabilities={"embed_documents", "embed_query"})
    embedding_registry.register("azure", _build_azure_embeddings, capabilities={"embed_documents", "embed_query"})
    embedding_registry.register("voyage", _build_voyage_embeddings, capabilities={"embed_documents", "embed_query"})
    embedding_registry.register(
        "huggingface",
        _build_huggingface_embeddings,
        capabilities={"embed_documents", "embed_query", "local"},
    )
    embedding_registry.register("ollama", _build_ollama_embeddings, capabilities={"embed_documents", "embed_query"})
    embedding_registry.register("cohere", _build_cohere_embeddings, capabilities={"embed_documents", "embed_query"})

    vector_store_registry.register("qdrant", _build_qdrant_store, capabilities={"vector_search", "hybrid_search"})
    vector_store_registry.register("local", _build_qdrant_store, capabilities={"vector_search", "hybrid_search"})

    graph_store_registry.register("neo4j", _build_neo4j_store, capabilities={"graph_search", "graph_upsert"})

    logger.info(
        "provider_registry_bootstrapped",
        llm=llm_registry.list(),
        embeddings=embedding_registry.list(),
        vector_stores=vector_store_registry.list(),
        graph_stores=graph_store_registry.list(),
    )


register_default_providers()
