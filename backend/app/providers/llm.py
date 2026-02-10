import time

import structlog
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_ollama import ChatOllama
from backend.app.core.config import ai_settings
from backend.app.core.settings_manager import settings_manager
from backend.app.core.telemetry import (
    get_tracer,
    LLM_REQUEST_LATENCY,
    LLM_REQUEST_COUNT,
)
from typing import Optional

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


async def get_llm(workspace_id: Optional[str] = None):
    """Factory to get the configured LLM provider for a specific workspace."""
    settings = await settings_manager.get_settings(workspace_id)
    provider = settings.llm_provider.lower()
    model = settings.llm_model

    # Trace the provider resolution itself — useful for debugging
    # which workspace resolved to which LLM config
    with tracer.start_as_current_span(
        "llm.resolve_provider",
        attributes={
            "llm.provider": provider,
            "llm.model": model,
            "workspace_id": workspace_id or "default",
        },
    ):
        start = time.perf_counter()

        logger.info(
            "llm_provider_resolved",
            provider=provider,
            model=model,
            workspace_id=workspace_id or "default",
        )

        if provider == "openai":
            llm = ChatOpenAI(
                model=model,
                api_key=ai_settings.OPENAI_API_KEY,
                streaming=True,
            )
        elif provider == "anthropic":
            llm = ChatAnthropic(
                model=model,
                api_key=ai_settings.ANTHROPIC_API_KEY,
                streaming=True,
            )
        elif provider == "ollama":
            llm = ChatOllama(
                model=model,
                base_url=ai_settings.OLLAMA_BASE_URL,
            )
        elif provider == "vllm":
            llm = ChatOpenAI(
                model=model,
                api_key="EMPTY",
                base_url=ai_settings.VLLM_BASE_URL,
                streaming=True,
            )
        elif provider == "llama-cpp":
            llm = ChatOpenAI(
                model=model,
                api_key="EMPTY",
                base_url=ai_settings.LLAMACPP_BASE_URL,
                streaming=True,
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

        duration = time.perf_counter() - start
        LLM_REQUEST_LATENCY.labels(provider=provider, operation="init").observe(duration)
        LLM_REQUEST_COUNT.labels(provider=provider, operation="init", status="ok").inc()

        return llm
