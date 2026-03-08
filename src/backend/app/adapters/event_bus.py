from __future__ import annotations

import json
from collections import defaultdict
from typing import Iterable

from app.core.events import EventEnvelope
from app.core.ports import EventBus, Subscriber

try:
    from redis import Redis
except ImportError:  # pragma: no cover - dependency injected at runtime
    Redis = None


class _InMemoryEventBus(EventBus):
    def __init__(self, name: str) -> None:
        self.name = name
        self._events: list[EventEnvelope] = []
        self._subscribers: dict[str, list[Subscriber]] = defaultdict(list)

    def publish(self, event: EventEnvelope) -> None:
        self._events.append(event)
        for handler in self._subscribers.get(event.event_type, []):
            handler(event)
        for handler in self._subscribers.get("*", []):
            handler(event)

    def publish_many(self, events: Iterable[EventEnvelope]) -> None:
        for event in events:
            self.publish(event)

    def subscribe(self, event_type: str, handler: Subscriber) -> None:
        self._subscribers[event_type].append(handler)

    def events(self) -> list[EventEnvelope]:
        return list(self._events)


class RedisStreamsEventBus(_InMemoryEventBus):
    def __init__(self, redis_url: str | None = None, stream_name: str = "karag.events") -> None:
        super().__init__("redis-streams")
        self.stream_name = stream_name
        self._redis = None
        if Redis and redis_url:
            try:
                self._redis = Redis.from_url(redis_url, decode_responses=True)
                self._redis.ping()
            except Exception:
                self._redis = None

    def publish(self, event: EventEnvelope) -> None:
        if self._redis:
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


class NATSEventBus(_InMemoryEventBus):
    def __init__(self) -> None:
        super().__init__("nats")


class KafkaEventBus(_InMemoryEventBus):
    def __init__(self) -> None:
        super().__init__("kafka")
