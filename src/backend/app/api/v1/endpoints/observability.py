from __future__ import annotations

from fastapi import APIRouter, Request

from app.karag_manager import KaragManager


router = APIRouter(prefix="/observability", tags=["observability"])


@router.get("/summary")
def observability_summary(request: Request) -> dict[str, object]:
    karag_manager: KaragManager = request.app.state.karag_manager
    summary = karag_manager.telemetry.summary()
    summary["event_bus"] = karag_manager.event_bus.name
    summary["events"] = [
        {
            "event_type": event.event_type,
            "resource_id": event.resource_id,
            "workspace_id": event.workspace_id,
            "occurred_at": event.occurred_at.isoformat(),
        }
        for event in karag_manager.event_bus.events()[-20:]
    ]
    return summary
