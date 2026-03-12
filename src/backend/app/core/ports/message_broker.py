from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Coroutine, Dict, Union

# Handlers can be sync or async
JobHandler = Callable[["JobMessage"], Union[None, Coroutine[Any, Any, None]]]

@dataclass
class JobMessage:
    """The standard envelope for asynchronous tasks within Karag."""
    job_type: str
    payload: Dict[str, Any]
    job_id: str
    organization_id: str
    project_id: str
    workspace_id: str | None = None
    actor_id: str = "system"
    correlation_id: str | None = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    attempt: int = 0
    max_retries: int = 3

class MessageBroker(ABC):
    """Port for publishing and subscribing to asynchronous messages."""
    
    @abstractmethod
    async def publish(self, job: JobMessage) -> None:
        """Enqueue a job for processing."""
        pass

    @abstractmethod
    def subscribe(self, job_type: str, handler: JobHandler) -> None:
        """Register a handler for a specific job type."""
        pass

    @abstractmethod
    async def start_consuming(self) -> None:
        """Start the background consumption loop (if applicable)."""
        pass

    @abstractmethod
    async def stop(self) -> None:
        """Gracefully shutdown the broker."""
        pass
