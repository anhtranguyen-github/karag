from __future__ import annotations
from typing import Annotated
import logging
from fastapi import APIRouter, Depends, Request, status
from app.karag_manager import KaragManager
from app.modules.organizations.schemas import OrganizationCreate, OrganizationSummary
from app.modules.organizations.schemas import ProjectCreate, ProjectSummary, ProjectUpdate
from app.modules.organizations.services import OrganizationService
from app.core.tenancy import BootstrapContext, TenantContext, get_bootstrap_context, get_tenant_context

router = APIRouter(prefix="/organizations", tags=["organizations"])
logger = logging.getLogger(__name__)

def get_service(request: Request) -> OrganizationService:
    karag_manager: KaragManager = request.app.state.karag_manager
    return karag_manager.organization_service # Will fix manager later

@router.post("", response_model=OrganizationSummary, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    service: Annotated[OrganizationService, Depends(get_service)],
) -> OrganizationSummary:
    return service.create_organization(payload)

@router.get("", response_model=list[OrganizationSummary])
def list_organizations(
    ctx: Annotated[BootstrapContext, Depends(get_bootstrap_context)],
    service: Annotated[OrganizationService, Depends(get_service)],
) -> list[OrganizationSummary]:
    return service.list_all_organizations()

@router.get("/{organization_id}", response_model=OrganizationSummary)
def get_organization(
    organization_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[OrganizationService, Depends(get_service)],
) -> OrganizationSummary:
    return service.get_organization(tenant, organization_id)

@router.post("/{organization_id}/projects", response_model=ProjectSummary, status_code=status.HTTP_201_CREATED)
def create_project(
    organization_id: str,
    payload: ProjectCreate,
    service: Annotated[OrganizationService, Depends(get_service)],
) -> ProjectSummary:
    return service.create_project(organization_id, payload)

@router.get("/{organization_id}/projects", response_model=list[ProjectSummary])
def list_projects(
    organization_id: str,
    ctx: Annotated[BootstrapContext, Depends(get_bootstrap_context)],
    service: Annotated[OrganizationService, Depends(get_service)],
) -> list[ProjectSummary]:
    return service.list_all_projects(organization_id)

@router.get("/{organization_id}/projects/{project_id}", response_model=ProjectSummary)
def get_project(
    organization_id: str,
    project_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[OrganizationService, Depends(get_service)],
) -> ProjectSummary:
    return service.get_project(tenant, organization_id, project_id)

@router.put("/{organization_id}/projects/{project_id}", response_model=ProjectSummary)
def update_project(
    organization_id: str,
    project_id: str,
    payload: ProjectUpdate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[OrganizationService, Depends(get_service)],
) -> ProjectSummary:
    return service.update_project(tenant, organization_id, project_id, payload)
