from __future__ import annotations

from typing import Annotated

from fastapi import Header, HTTPException, status
from pydantic import BaseModel


class TenantContext(BaseModel):
    organization_id: str
    project_id: str
    workspace_id: str | None = None
    actor_id: str = "system"


def get_tenant_context(
    organization_id: Annotated[str, Header(alias="X-Organization-Id")],
    project_id: Annotated[str, Header(alias="X-Project-Id")],
    tenant_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
    actor_id: Annotated[str | None, Header(alias="X-Actor-Id")] = None,
) -> TenantContext:
    return TenantContext(
        organization_id=organization_id,
        project_id=project_id,
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
