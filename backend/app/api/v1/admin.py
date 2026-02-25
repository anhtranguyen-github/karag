from fastapi import APIRouter
from typing import Dict, Any
from backend.app.core.prompt_manager import prompt_manager
from backend.app.core.settings_manager import settings_manager
from backend.app.schemas.base import AppResponse

router = APIRouter(prefix="/admin", tags=["Admin & Ops"])


@router.get("/prompts")
async def get_prompts():
    """List all prompts in the registry."""
    return AppResponse.success_response(data=prompt_manager.get_all_prompts())


@router.get("/vector/status")
async def get_vector_status():
    """Get status of the vector store."""
    from backend.app.core.factory import LangChainFactory

    store = await LangChainFactory.get_vector_store()
    status = await store.get_system_info()
    return AppResponse.success_response(data=status)


@router.get("/ops/overview")
async def get_ops_overview():
    """Get a high-level overview of system components."""
    # This could be expanded with more health checks
    return AppResponse.success_response(
        data={
            "version": "1.0.0",
            "services": {
                "prompt_registry": "healthy",
                "vector_store": "healthy",
                "telemetry": "active",
            },
        }
    )


@router.get("/settings")
async def get_global_settings():
    """Get global system settings."""
    settings = await settings_manager.get_settings(workspace_id=None)
    return AppResponse.success_response(data=settings.model_dump())


@router.get("/settings/metadata")
async def get_global_settings_metadata():
    """Get metadata for settings fields."""
    metadata = settings_manager.get_settings_metadata()
    return AppResponse.success_response(data=metadata)


@router.patch("/settings")
async def update_global_settings(updates: Dict[str, Any]):
    """Update global system settings (workspace_id='default')."""
    settings = await settings_manager.update_settings(updates, workspace_id="default")
    return AppResponse.success_response(data=settings.model_dump())
