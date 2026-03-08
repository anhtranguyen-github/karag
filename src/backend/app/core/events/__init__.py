from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.core.tenancy import TenantContext


DOCUMENT_UPLOADED = "document_uploaded"
DOCUMENT_PARSED = "document_parsed"
DATASET_UPDATED = "dataset_updated"
EMBEDDINGS_CREATED = "embeddings_created"
PIPELINE_STARTED = "pipeline_started"
PIPELINE_FINISHED = "pipeline_finished"
EVALUATION_COMPLETED = "evaluation_completed"
MODEL_REGISTERED = "model_registered"
MODEL_DEPLOYED = "model_deployed"
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


class TransactionalOutbox:
    def __init__(self) -> None:
        self._events: list[EventEnvelope] = []

    def stage(self, event: EventEnvelope) -> None:
        self._events.append(event)

    def flush(self, event_bus) -> list[EventEnvelope]:
        published = list(self._events)
        self._events.clear()
        if published:
            event_bus.publish_many(published)
        return published
