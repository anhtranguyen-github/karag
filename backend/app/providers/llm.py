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
    from backend.app.schemas.generation import (
        OpenAIGenerationConfig, AzureOpenAIGenerationConfig, LlamaGenerationConfig,
        CDP2GenerationConfig, VLMGenerationConfig
    )
    
    settings = await settings_manager.get_settings(workspace_id)
    config = settings.generation
    provider = config.provider

    with tracer.start_as_current_span(
        "llm.resolve_provider",
        attributes={
            "llm.provider": provider,
            "llm.model": config.model,
            "workspace_id": workspace_id or "default",
        },
    ):
        start = time.perf_counter()

        logger.info(
            "llm_provider_resolved",
            provider=provider,
            model=config.model,
            workspace_id=workspace_id or "default",
        )

        # Base configuration from schema
        base_kwargs = {
            "temperature": config.temperature,
            "max_tokens": config.max_output_tokens,
            "streaming": config.streaming,
        }
        
        # Reliability defaults
        common_kwargs = {
            "max_retries": 2,
            "request_timeout": 30,
        }

        if isinstance(config, OpenAIGenerationConfig):
            llm = ChatOpenAI(
                model=config.model,
                api_key=ai_settings.OPENAI_API_KEY,
                presence_penalty=config.presence_penalty,
                frequency_penalty=config.frequency_penalty,
                **base_kwargs,
                **common_kwargs
            )
        elif isinstance(config, AzureOpenAIGenerationConfig):
            from langchain_openai import AzureChatOpenAI
            llm = AzureChatOpenAI(
                azure_deployment=config.deployment_name,
                openai_api_version=config.api_version,
                api_key=ai_settings.AZURE_OPENAI_API_KEY,
                **base_kwargs,
                **common_kwargs
            )
        elif isinstance(config, (LlamaGenerationConfig, CDP2GenerationConfig, VLMGenerationConfig)):
            # Local models typically served via Ollama or VLLM
            # For simplicity, we fallback to Ollama if it's one of these types
            # but we can specialize further based on provider
            llm = ChatOllama(
                model=config.model,
                base_url=ai_settings.OLLAMA_BASE_URL,
                temperature=config.temperature,
                # top_k=getattr(config, 'top_k', 40),
                **common_kwargs
            )
        else:
            raise ValueError(f"Unsupported Generation provider: {provider}")

        # --- PRODUCTION FALLBACK STRATEGY ---
        if provider != "ollama" and ai_settings.OLLAMA_BASE_URL:
            fallback_llm = ChatOllama(
                model="llama3:latest",
                base_url=ai_settings.OLLAMA_BASE_URL,
                **common_kwargs
            )
            llm = llm.with_fallbacks([fallback_llm])
            logger.info("llm_fallback_configured", primary=provider, secondary="ollama")

        duration = time.perf_counter() - start
        LLM_REQUEST_LATENCY.labels(provider=provider, operation="init").observe(duration)
        LLM_REQUEST_COUNT.labels(provider=provider, operation="init", status="ok").inc()

        return llm
