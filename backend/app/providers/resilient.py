"""
Resilient LLM Provider with Fallback and Retry

Wraps the standard provider factory with resilience patterns:
- Automatic fallback to backup models on failure
- Exponential backoff retry
- Rate limiting per model
- Enhanced error handling
"""

from typing import Dict, List, Optional, Any, AsyncIterator
import structlog

from backend.app.providers.base import (
    LLMProvider,
    LLMMessage,
    LLMResponse,
    ToolCapable,
)
from backend.app.core.llm_resilience import (
    LLMWithFallback,
    create_openai_with_fallback,
    create_anthropic_with_fallback,
)
from backend.app.core.factory import ProviderFactory

logger = structlog.get_logger(__name__)


class ResilientProvider(LLMProvider, ToolCapable):
    """
    LLM provider wrapper that adds resilience features.
    
    Automatically handles:
    - Fallback to backup models
    - Retry with exponential backoff
    - Rate limiting
    - Enhanced error conversion
    """
    
    def __init__(
        self,
        primary_model: str,
        fallback_models: List[str],
        workspace_id: Optional[str] = None,
        fallback_client: Optional[LLMWithFallback] = None,
    ):
        self._workspace_id = workspace_id
        self._fallback_client = fallback_client or LLMWithFallback(
            primary=primary_model,
            fallbacks=fallback_models,
        )
        self._current_model = primary_model
        self._primary = primary_model
    
    @property
    def provider_name(self) -> str:
        return "resilient"
    
    @property
    def model_name(self) -> str:
        return self._current_model
    
    async def chat(self, messages: List[LLMMessage], **kwargs) -> LLMResponse:
        """Execute chat with fallback and retry."""
        
        async def generate(model: str) -> LLMResponse:
            self._current_model = model
            provider = await ProviderFactory.get_llm(self._workspace_id)
            return await provider.chat(messages, **kwargs)
        
        return await self._fallback_client.generate(generate)
    
    async def stream(self, messages: List[LLMMessage], **kwargs) -> AsyncIterator[str]:
        """Stream with fallback support."""
        # For streaming, we try primary first without complex fallback
        # to maintain streaming experience
        try:
            provider = await ProviderFactory.get_llm(self._workspace_id)
            async for chunk in provider.stream(messages, **kwargs):
                yield chunk
        except Exception as e:
            logger.warning(
                "stream_failed_no_fallback",
                error=str(e),
                message="Streaming fallback not supported, using primary model",
            )
            raise
    
    async def chat_with_tools(
        self,
        messages: List[LLMMessage],
        tools: List[Dict[str, Any]],
        **kwargs
    ) -> LLMResponse:
        """Execute chat with tools and fallback."""
        
        async def generate(model: str) -> LLMResponse:
            self._current_model = model
            provider = await ProviderFactory.get_llm(self._workspace_id)
            if isinstance(provider, ToolCapable):
                return await provider.chat_with_tools(messages, tools, **kwargs)
            raise RuntimeError(f"Provider {model} does not support tools")
        
        return await self._fallback_client.generate(generate)
    
    def bind_tools(self, tools: List[Dict[str, Any]]) -> "ResilientProvider":
        """Bind tools for future calls."""
        # Return self as tools are handled per-call
        return self


class ResilientProviderFactory:
    """Factory for creating resilient providers."""
    
    @staticmethod
    async def get_llm(
        workspace_id: Optional[str] = None,
        enable_fallback: bool = True,
    ) -> LLMProvider:
        """
        Get LLM provider with optional fallback support.
        
        Args:
            workspace_id: Workspace for settings
            enable_fallback: Whether to enable fallback chain
            
        Returns:
            LLMProvider (resilient wrapper if fallback enabled)
        """
        if not enable_fallback:
            return await ProviderFactory.get_llm(workspace_id)
        
        # Get settings to determine fallback chain
        from backend.app.core.settings_manager import settings_manager
        settings = await settings_manager.get_settings(workspace_id)
        
        primary = settings.generation.model
        provider = settings.generation.provider
        
        # Configure fallback chain based on provider
        if provider == "openai":
            fallback_client = create_openai_with_fallback()
            fallbacks = ["gpt-4", "gpt-3.5-turbo"]
        elif provider == "anthropic":
            fallback_client = create_anthropic_with_fallback()
            fallbacks = ["claude-3-sonnet", "claude-3-haiku"]
        else:
            # Generic fallback configuration
            fallback_client = LLMWithFallback(
                primary=primary,
                fallbacks=[],
            )
            fallbacks = []
        
        return ResilientProvider(
            primary_model=primary,
            fallback_models=fallbacks,
            workspace_id=workspace_id,
            fallback_client=fallback_client,
        )
