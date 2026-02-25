from fastapi import APIRouter, Query, Depends
from typing import Dict, Any, Optional
from backend.app.core.settings_manager import settings_manager

from backend.app.schemas.base import AppResponse

from backend.app.api.deps import get_current_workspace

router = APIRouter(tags=["settings"])


@router.get("/")
async def get_settings(current_workspace: dict = Depends(get_current_workspace)):
    """Get settings for a specific workspace."""
    settings = await settings_manager.get_settings(current_workspace["id"])
    return AppResponse.success_response(data=settings.model_dump())


@router.get("/metadata")
async def get_settings_metadata(current_workspace: dict = Depends(get_current_workspace)):
    """Get metadata describing setting field properties and editability."""
    metadata = settings_manager.get_settings_metadata()
    return AppResponse.success_response(data=metadata)


@router.patch("/")
async def update_settings(
    updates: Dict[str, Any], current_workspace: dict = Depends(get_current_workspace)
):
    """Update settings for a specific workspace."""
    settings = await settings_manager.update_settings(updates, current_workspace["id"])
    return AppResponse.success_response(data=settings.model_dump())
