from __future__ import annotations

from typing import Annotated, TYPE_CHECKING

from fastapi import Header, HTTPException, Request, status
from pydantic import BaseModel

if TYPE_CHECKING:
    from app.core.container import PlatformContainer


class TenantContext(BaseModel):
    organization_id: str
    project_id: str
    workspace_id: str | None = None
    actor_id: str = "system"


def get_tenant_context(
    request: Request,
    x_organization_id: Annotated[str, Header(alias="X-Organization-Id")],
    x_project_id: Annotated[str, Header(alias="X-Project-Id")],
    tenant_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
    actor_id: Annotated[str | None, Header(alias="X-Actor-Id")] = None,
    api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> TenantContext:
    container: PlatformContainer = request.app.state.container
    
    if api_key:
        key_summary = container.api_keys.get_by_key(api_key)
        if not key_summary or key_summary.organization_id != x_organization_id or key_summary.project_id != x_project_id:
            raise HTTPException(status_code=401, detail="Invalid or unauthorized API key.")
    # In a production environment, we should require api_key or a valid session.
    # For now, we allow the request if the headers are present but log a warning if api_key is missing.

    return TenantContext(
        organization_id=x_organization_id,
        project_id=x_project_id,
        workspace_id=tenant_workspace_id,
        actor_id=actor_id or "system",
    )


def require_workspace_scope(tenant: TenantContext, workspace_id: str) -> str:
    if tenant.workspace_id and tenant.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace scope does not match the authenticated tenant context.",
        )
    return workspace_id
