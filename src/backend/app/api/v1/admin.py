from typing import Any

from fastapi import APIRouter
from src.backend.app.core.prompt_manager import prompt_manager
from src.backend.app.core.settings_manager import settings_manager
from src.backend.app.schemas.base import AppResponse
from src.backend.app.schemas.deployment import DeploymentConfigUpdate
from src.backend.app.services.deployment_service import deployment_service

router = APIRouter(prefix="/admin", tags=["AdminOps"])


@router.get("/prompts")
async def get_prompts():
    """List all prompts in the registry."""
    return AppResponse.success_response(data=prompt_manager.get_all_prompts())


@router.get("/vector/status")
async def get_vector_status():
    """Get status of the vector store."""
    from src.backend.app.core.factory import ProviderFactory

    store = await ProviderFactory.get_vector_store()
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
async def update_global_settings(updates: dict[str, Any]):
    """Update global system settings (workspace_id='default')."""
    settings = await settings_manager.update_settings(updates, workspace_id="default")
    return AppResponse.success_response(data=settings.model_dump())


@router.get("/deployment/config")
async def get_deployment_config():
    """Return deployment configuration with secrets redacted."""
    return AppResponse.success_response(data=deployment_service.get_public_config().model_dump())


@router.patch("/deployment/config")
async def update_deployment_config(update: DeploymentConfigUpdate):
    """Persist deployment configuration and apply runtime environment overrides."""
    return AppResponse.success_response(data=deployment_service.update_config(update).model_dump())


@router.get("/deployment/detect")
async def detect_local_deployment():
    """Detect common locally hosted dependencies used for local deployments."""
    result = await deployment_service.detect_local_services()
    return AppResponse.success_response(data=result.model_dump())


@router.post("/deployment/verify")
async def verify_deployment():
    """Verify configured cloud/local deployment services and provider credentials."""
    result = await deployment_service.verify_config()
    return AppResponse.success_response(data=result.model_dump())
