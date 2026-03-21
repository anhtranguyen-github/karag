from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Iterable, Protocol, runtime_checkable
from uuid import uuid4

from app.core.tenancy import TenantContext


DOCUMENT_UPLOADED = "document_uploaded"
DOCUMENT_PARSED = "document_parsed"
EMBEDDINGS_CREATED = "embeddings_created"
EVALUATION_COMPLETED = "evaluation_completed"
WORKSPACE_UPDATED = "workspace_updated"


@dataclass(slots=True)
class EventEnvelope:
    event_type: str
    organization_id: str
    project_id: str
    workspace_id: str | None
    resource_id: str
    actor_id: str
    payload: dict[str, Any] = field(default_factory=dict)
    correlation_id: str | None = None
    causation_id: str | None = None
    event_id: str = field(default_factory=lambda: str(uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))


def build_event(
    *,
    event_type: str,
    tenant: TenantContext,
    resource_id: str,
    payload: dict[str, Any] | None = None,
    correlation_id: str | None = None,
    causation_id: str | None = None,
    workspace_id: str | None = None,
) -> EventEnvelope:
    return EventEnvelope(
        event_type=event_type,
        organization_id=tenant.organization_id,
        project_id=tenant.project_id,
        workspace_id=workspace_id or tenant.workspace_id,
        resource_id=resource_id,
        actor_id=tenant.actor_id,
        payload=payload or {},
        correlation_id=correlation_id,
        causation_id=causation_id,
    )


@runtime_checkable
class EventBus(Protocol):
    name: str

    def publish(self, event: EventEnvelope) -> None:
        ...

    def publish_many(self, events: Iterable[EventEnvelope]) -> None:
        ...

    def subscribe(self, event_type: str, handler: Any) -> None:
        ...

    def events(self) -> list[EventEnvelope]:
        ...


class TransactionalOutbox:
    def __init__(self) -> None:
        self._events: list[EventEnvelope] = []

    def stage(self, event: EventEnvelope) -> None:
        self._events.append(event)

    def flush(self, event_bus: EventBus) -> list[EventEnvelope]:
        published = list(self._events)
        self._events.clear()
        if published:
            event_bus.publish_many(published)
        return published


class InMemoryEventBus(EventBus):
    def __init__(self, name: str = "in-memory") -> None:
        self.name = name
        self._events: list[EventEnvelope] = []
        self._subscribers: dict[str, list[Any]] = {}

    def publish(self, event: EventEnvelope) -> None:
        self._events.append(event)
        for handler in self._subscribers.get(event.event_type, []):
            handler(event)
        for handler in self._subscribers.get("*", []):
            handler(event)

    def publish_many(self, events: Iterable[EventEnvelope]) -> None:
        for event in events:
            self.publish(event)

    def subscribe(self, event_type: str, handler: Any) -> None:
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    def events(self) -> list[EventEnvelope]:
        return list(self._events)

class RedisStreamsEventBus(InMemoryEventBus):
    def __init__(self, redis_url: str | None = None, stream_name: str = "karag.events") -> None:
        super().__init__("redis-streams")
        self.stream_name = stream_name
        self._redis = None
        try:
            from redis import Redis
            if redis_url:
                self._redis = Redis.from_url(redis_url, decode_responses=True)
                self._redis.ping()
        except Exception:
            self._redis = None

    def publish(self, event: EventEnvelope) -> None:
        if self._redis:
            import json
            self._redis.xadd(
                self.stream_name,
                {
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "organization_id": event.organization_id,
                    "project_id": event.project_id,
                    "workspace_id": event.workspace_id or "",
                    "resource_id": event.resource_id,
                    "actor_id": event.actor_id,
                    "correlation_id": event.correlation_id or "",
                    "causation_id": event.causation_id or "",
                    "occurred_at": event.occurred_at.isoformat(),
                    "payload": json.dumps(event.payload),
                },
            )
        super().publish(event)
