from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Dict, List, Optional
from pydantic import BaseModel

class LLMResponse(BaseModel):
    content: str
    usage: Optional[Dict[str, int]] = {}
    metadata: Optional[Dict[str, Any]] = {}

class ILLMProvider(ABC):
    @abstractmethod
    async def generate_chat(
        self, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> LLMResponse:
        """Generate a chat response."""
        pass

    @abstractmethod
    async def generate_stream(
        self, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> AsyncIterator[str]:
        """Generate a streaming chat response."""
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of the provider."""
        pass
