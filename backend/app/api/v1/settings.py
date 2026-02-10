from fastapi import APIRouter, Query
from typing import Dict, Any, Optional
from backend.app.core.schemas import AppSettings
from backend.app.core.settings_manager import settings_manager

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/", response_model=AppSettings)
async def get_settings(workspace_id: Optional[str] = Query(None)):
    """Get settings for a specific workspace or global defaults."""
    return await settings_manager.get_settings(workspace_id)

@router.patch("/", response_model=AppSettings)
async def update_settings(updates: Dict[str, Any], workspace_id: Optional[str] = Query(None)):
    """Update settings for a specific workspace or global defaults."""
    return await settings_manager.update_settings(updates, workspace_id)
