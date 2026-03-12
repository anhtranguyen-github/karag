from __future__ import annotations

from typing import Annotated, Any
from fastapi import Header, HTTPException, Request, status
from pydantic import BaseModel, Field


class BootstrapContext(BaseModel):
    """Lightweight context for discovery endpoints that don't yet know org/project."""
    actor_id: str


def get_bootstrap_context(
    actor_id: Annotated[str | None, Header(alias="X-Actor-Id")] = None,
) -> BootstrapContext:
    return BootstrapContext(actor_id=actor_id or "system")


class TenantContext(BaseModel):
    organization_id: str
    project_id: str
    workspace_id: str | None = None
    actor_id: str
    permissions: set[str] = Field(default_factory=set)


def get_tenant_context(
    request: Request,
    x_organization_id: Annotated[str, Header(alias="X-Organization-Id")],
    x_project_id: Annotated[str, Header(alias="X-Project-Id")],
    tenant_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
    actor_id: Annotated[str | None, Header(alias="X-Actor-Id")] = None,
    api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> TenantContext:
    karag_manager: Any = request.app.state.karag_manager
    
    if api_key:
        key_summary = karag_manager.api_keys.get_by_key(api_key)
        if not key_summary or key_summary.organization_id != x_organization_id or key_summary.project_id != x_project_id:
            raise HTTPException(status_code=401, detail="Invalid or unauthorized API key.")
    # In a production environment, we should require api_key or a valid session.
    # For now, we allow the request if the headers are present but log a warning if api_key is missing.

    # Calculate permissions for the current context
    permissions = set()
    if actor_id:
        permissions = karag_manager.access_service.get_effective_permissions(
            actor_id, x_organization_id, x_project_id
        )

    # Dev-mode fallback: when no API key is required and the user has no
    # memberships yet, grant admin-level permissions so the dashboard is
    # usable before a real auth layer is in place.
    if getattr(karag_manager.settings, "database_url", "").startswith("sqlite") and not api_key and not permissions:
        import os
        import logging
        if os.getenv("TESTING") == "1":
            logging.getLogger(__name__).warning(
                "DEV-MODE FALLBACK: actor_id=%s org=%s prj=%s → granting admin perms (no memberships found)",
                actor_id, x_organization_id, x_project_id,
            )
            from app.modules.auth.access_service import DEFAULT_ROLE_PERMISSIONS
            permissions = set(DEFAULT_ROLE_PERMISSIONS["admin"])

    if not permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No effective permissions for the requested tenant scope.",
        )

    return TenantContext(
        organization_id=x_organization_id,
        project_id=x_project_id,
        workspace_id=tenant_workspace_id,
        actor_id=actor_id or "system",
        permissions=permissions,
    )


def require_workspace_scope(tenant: TenantContext, workspace_id: str) -> str:
    if tenant.workspace_id and tenant.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace scope does not match the authenticated tenant context.",
        )
    return workspace_id
