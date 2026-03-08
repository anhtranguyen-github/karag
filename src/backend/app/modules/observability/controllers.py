from __future__ import annotations

from fastapi import APIRouter, Request

from app.core.container import PlatformContainer


router = APIRouter(prefix="/api/v1/observability", tags=["observability"])


@router.get("/summary")
def observability_summary(request: Request) -> dict[str, object]:
    container: PlatformContainer = request.app.state.container
    summary = container.telemetry.summary()
    summary["event_bus"] = container.event_bus.name
    summary["events"] = [
        {
            "event_type": event.event_type,
            "resource_id": event.resource_id,
            "workspace_id": event.workspace_id,
            "occurred_at": event.occurred_at.isoformat(),
        }
        for event in container.event_bus.events()[-20:]
    ]
    return summary
