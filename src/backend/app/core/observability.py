from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class TelemetryTrace(BaseModel):
    trace_id: str = Field(default_factory=lambda: str(uuid4()))
    trace_type: str
    organization_id: str
    project_id: str
    workspace_id: str | None = None
    resource_id: str | None = None
    status: str = "ok"
    captured: dict[str, Any] = Field(default_factory=dict)
    metrics: dict[str, float | int] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TelemetryStore:
    def __init__(self, redact_by_default: bool, allowed_unredacted: tuple[str, ...]) -> None:
        self._traces: list[TelemetryTrace] = []
        self._events: list[dict[str, Any]] = []
        self._redact_by_default = redact_by_default
        self._allowed_unredacted = set(allowed_unredacted)

    def _redact(self, workspace_id: str | None, value: Any) -> Any:
        if not self._redact_by_default:
            return value
        if workspace_id and workspace_id in self._allowed_unredacted:
            return value
        if isinstance(value, str):
            return "[REDACTED]"
        if isinstance(value, list):
            return ["[REDACTED]" for _ in value]
        if isinstance(value, dict):
            return {key: "[REDACTED]" for key in value}
        return value

    def record_event(self, event_type: str, payload: dict[str, Any]) -> None:
        self._events.append({"event_type": event_type, "payload": payload})

    def record_trace(
        self,
        *,
        trace_type: str,
        organization_id: str,
        project_id: str,
        workspace_id: str | None,
        resource_id: str | None = None,
        status: str = "ok",
        captured: dict[str, Any] | None = None,
        metrics: dict[str, float | int] | None = None,
    ) -> TelemetryTrace:
        trace = TelemetryTrace(
            trace_type=trace_type,
            organization_id=organization_id,
            project_id=project_id,
            workspace_id=workspace_id,
            resource_id=resource_id,
            status=status,
            captured={
                key: self._redact(workspace_id, value)
                for key, value in (captured or {}).items()
            },
            metrics=metrics or {},
        )
        self._traces.append(trace)
        return trace

    def recent_traces(self, limit: int = 20) -> list[TelemetryTrace]:
        return list(reversed(self._traces[-limit:]))

    def summary(self) -> dict[str, Any]:
        trace_counts = Counter(trace.trace_type for trace in self._traces)
        event_counts = Counter(event["event_type"] for event in self._events)
        return {
            "trace_counts": dict(trace_counts),
            "event_counts": dict(event_counts),
            "recent_traces": [trace.model_dump(mode="json") for trace in self.recent_traces()],
        }
