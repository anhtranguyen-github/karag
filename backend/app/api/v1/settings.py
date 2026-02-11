from fastapi import APIRouter, Query
from typing import Dict, Any, Optional
from backend.app.core.schemas import AppSettings
from backend.app.core.settings_manager import settings_manager

router = APIRouter(prefix="/settings", tags=["settings"])

from backend.app.schemas.base import AppResponse

@router.get("/")
async def get_settings(workspace_id: Optional[str] = Query(None)):
    """Get settings for a specific workspace or global defaults."""
    settings = await settings_manager.get_settings(workspace_id)
    return AppResponse.success_response(data=settings.model_dump())

@router.patch("/")
async def update_settings(updates: Dict[str, Any], workspace_id: Optional[str] = Query(None)):
    """Update settings for a specific workspace or global defaults."""
    settings = await settings_manager.update_settings(updates, workspace_id)
    return AppResponse.success_response(data=settings.model_dump())
