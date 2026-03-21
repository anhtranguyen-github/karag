"""Message broker port — abstraction for async job queues.

Follows the same pattern as EventBus (Protocol + in-memory fallback + Redis impl).
EventBus is for fire-and-forget domain events (telemetry, notifications).
MessageBroker is for reliable job processing with acknowledgment semantics.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Callable, Protocol, runtime_checkable
from uuid import uuid4


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass(slots=True, frozen=True)
class JobMessage:
    """Immutable job envelope sent through the broker."""
    job_type: str
    payload: dict[str, Any]
    job_id: str = field(default_factory=lambda: str(uuid4()))
    organization_id: str = ""
    project_id: str = ""
    workspace_id: str = ""
    actor_id: str = ""
    correlation_id: str = ""
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    attempt: int = 0
    max_retries: int = 3


# Handler type: async callable that processes a single job
JobHandler = Callable[[JobMessage], Any]


@runtime_checkable
class MessageBroker(Protocol):
    """Port for async job queue operations."""
    name: str

    async def publish(self, job: JobMessage) -> None:
        """Enqueue a job for async processing."""
        ...

    def subscribe(self, job_type: str, handler: JobHandler) -> None:
        """Register a handler for a specific job type."""
        ...

    async def start_consuming(self) -> None:
        """Start the consumer loop (called by worker process)."""
        ...

    async def stop(self) -> None:
        """Graceful shutdown."""
        ...
