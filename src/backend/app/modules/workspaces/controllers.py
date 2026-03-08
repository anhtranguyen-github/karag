from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from app.core.container import PlatformContainer
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.workspaces.schemas import (
    WorkspaceCreate,
    WorkspaceRagConfig,
    WorkspaceRagConfigUpdate,
    WorkspaceSummary,
)
from app.modules.workspaces.services import WorkspaceService


router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])


def get_service(request: Request) -> WorkspaceService:
    container: PlatformContainer = request.app.state.container
    return WorkspaceService(container)


@router.post("", response_model=WorkspaceSummary, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> WorkspaceSummary:
    return service.create_workspace(tenant, payload)


@router.get("", response_model=list[WorkspaceSummary])
def list_workspaces(
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> list[WorkspaceSummary]:
    return service.list_workspaces(tenant)


@router.get("/{workspace_id}", response_model=WorkspaceSummary)
def get_workspace(
    workspace_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> WorkspaceSummary:
    return service.get_workspace(tenant, workspace_id)


@router.get("/{workspace_id}/rag-config", response_model=WorkspaceRagConfig)
def get_workspace_rag_config(
    workspace_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> WorkspaceRagConfig:
    return service.get_rag_config(tenant, workspace_id)


@router.put("/{workspace_id}/rag-config", response_model=WorkspaceRagConfig)
def update_workspace_rag_config(
    workspace_id: str,
    payload: WorkspaceRagConfigUpdate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> WorkspaceRagConfig:
    return service.update_rag_config(tenant, workspace_id, payload)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> Response:
    service.delete_workspace(tenant, workspace_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
