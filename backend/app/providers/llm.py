from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_ollama import ChatOllama
from backend.app.core.config import ai_settings
from backend.app.core.settings_manager import settings_manager
from typing import Optional

async def get_llm(workspace_id: Optional[str] = None):
    """Factory to get the configured LLM provider for a specific workspace."""
    settings = await settings_manager.get_settings(workspace_id)
    provider = settings.llm_provider.lower()
    model = settings.llm_model
    
    if provider == "openai":
        return ChatOpenAI(
            model=model,
            api_key=ai_settings.OPENAI_API_KEY,
            streaming=True
        )
    elif provider == "anthropic":
        return ChatAnthropic(
            model=model,
            api_key=ai_settings.ANTHROPIC_API_KEY,
            streaming=True
        )
    elif provider == "ollama":
        return ChatOllama(
            model=model,
            base_url=ai_settings.OLLAMA_BASE_URL
        )
    elif provider == "vllm":
        return ChatOpenAI(
            model=model,
            api_key="EMPTY",
            base_url=ai_settings.VLLM_BASE_URL,
            streaming=True
        )
    elif provider == "llama-cpp":
        return ChatOpenAI(
            model=model,
            api_key="EMPTY",
            base_url=ai_settings.LLAMACPP_BASE_URL,
            streaming=True
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
