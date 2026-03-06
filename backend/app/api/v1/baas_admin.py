"""
BaaS Admin API Routes - Control Plane

Provides admin endpoints for:
- API key management
- System configuration
- Usage log querying

ACCESS: Operator/Admin only
"""

from datetime import datetime

from backend.app.api.baas_deps import AdminPermDep
from backend.app.schemas.baas import (
    APIKey,
    APIKeyCreateResponse,
    SystemConfig,
    UsageLog,
    WorkspaceConfig,
    WorkspaceUsageStats,
)
from backend.app.schemas.base import AppResponse
from backend.app.services.api_key_service import api_key_service
from backend.app.services.config_service import config_service
from backend.app.services.usage_service import usage_service
from fastapi import APIRouter, HTTPException, Query, status

router = APIRouter(prefix="/admin/baas", tags=["BaaS Admin"])


# =============================================================================
# API Key Management
# =============================================================================


@router.post(
    "/workspaces/{workspace_id}/api-keys",
    response_model=AppResponse[APIKeyCreateResponse],
)
async def create_api_key(
    workspace_id: str,
    permissions: list[str] = Query(default=["read", "write"]),
    expires_days: int | None = Query(default=None, ge=1, le=365),
    context: AdminPermDep = None,  # Requires admin permission
):
    """
    Create a new API key for a workspace.

    SECURITY: This is the ONLY time the full key is returned.
    Store it securely - it cannot be retrieved later.

    Required Permission: admin
    """
    try:
        response = await api_key_service.create_key(
            workspace_id=workspace_id,
            permissions=permissions,
            expires_days=expires_days,
        )
        return AppResponse.success_response(
            data=response,
            message="API key created successfully. SAVE THE KEY NOW - it will not be shown again.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "code": "API_KEY_CREATE_FAILED",
                "message": str(e),
            },
        )


@router.get("/workspaces/{workspace_id}/api-keys", response_model=AppResponse[list[APIKey]])
async def list_workspace_api_keys(
    workspace_id: str,
    include_inactive: bool = Query(default=False),
    context: AdminPermDep = None,
):
    """
    List API keys for a workspace.

    Note: Returns metadata only, NEVER the full key.

    Required Permission: admin
    """
    keys = await api_key_service.list_workspace_keys(
        workspace_id=workspace_id, include_inactive=include_inactive
    )
    return AppResponse.success_response(data=keys)


@router.delete("/api-keys/{key_id}", response_model=AppResponse)
async def revoke_api_key(
    key_id: str,
    reason: str | None = Query(default=None),
    context: AdminPermDep = None,
):
    """
    Revoke an API key.

    Required Permission: admin
    """
    success = await api_key_service.revoke_key(key_id=key_id, reason=reason)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "code": "API_KEY_NOT_FOUND",
                "message": f"API key '{key_id}' not found",
            },
        )

    return AppResponse.success_response(message=f"API key '{key_id}' revoked successfully")


# =============================================================================
# System Configuration
# =============================================================================


@router.get("/system/config", response_model=AppResponse[SystemConfig])
async def get_system_config(context: AdminPermDep = None):
    """
    Get system-level configuration.

    Required Permission: admin
    """
    config = await config_service.get_system_config()
    return AppResponse.success_response(data=config)


@router.put("/system/config", response_model=AppResponse[SystemConfig])
async def update_system_config(updates: dict, context: AdminPermDep = None):
    """
    Update system configuration.

    Some changes may require a system restart.

    Required Permission: admin
    """
    try:
        config = await config_service.update_system_config(updates)
        return AppResponse.success_response(data=config, message="System configuration updated")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "code": "CONFIG_UPDATE_FAILED",
                "message": str(e),
            },
        )


# =============================================================================
# Workspace Configuration
# =============================================================================


@router.get("/workspaces/{workspace_id}/config", response_model=AppResponse[WorkspaceConfig])
async def get_workspace_config(workspace_id: str, context: AdminPermDep = None):
    """
    Get workspace configuration.

    Required Permission: admin
    """
    config = await config_service.get_workspace_config(workspace_id)
    return AppResponse.success_response(data=config)


@router.put("/workspaces/{workspace_id}/config", response_model=AppResponse[WorkspaceConfig])
async def update_workspace_config(workspace_id: str, updates: dict, context: AdminPermDep = None):
    """
    Update workspace configuration.

    Changes are clamped to system limits.

    Required Permission: admin
    """
    try:
        config = await config_service.update_workspace_config(workspace_id, updates)
        return AppResponse.success_response(data=config, message="Workspace configuration updated")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "code": "CONFIG_UPDATE_FAILED",
                "message": str(e),
            },
        )


# =============================================================================
# Usage Logs
# =============================================================================


@router.get("/usage/logs", response_model=AppResponse[list[UsageLog]])
async def query_usage_logs(
    workspace_id: str | None = Query(default=None),
    endpoint: str | None = Query(default=None),
    status_code: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    context: AdminPermDep = None,
):
    """
    Query usage logs with filters.

    Required Permission: admin
    """
    logs = await usage_service.query_usage_logs(
        workspace_id=workspace_id,
        endpoint=endpoint,
        status_code=status_code,
        limit=limit,
        offset=offset,
    )
    return AppResponse.success_response(data=logs)


@router.get(
    "/usage/workspaces/{workspace_id}/stats",
    response_model=AppResponse[WorkspaceUsageStats],
)
async def get_workspace_usage_stats(
    workspace_id: str,
    days: int = Query(default=1, ge=1, le=30),
    context: AdminPermDep = None,
):
    """
    Get usage statistics for a workspace.

    Required Permission: admin
    """
    period_start = datetime.utcnow() - __import__("datetime").timedelta(days=days)
    stats = await usage_service.get_workspace_usage_stats(
        workspace_id=workspace_id, period_start=period_start
    )
    return AppResponse.success_response(data=stats)
