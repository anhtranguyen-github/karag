from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.core.container import PlatformContainer
from app.modules.organizations.schemas import OrganizationCreate, OrganizationSummary
from app.modules.organizations.schemas import ProjectCreate, ProjectSummary
from app.modules.organizations.services import OrganizationService


router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])


def get_service(request: Request) -> OrganizationService:
    container: PlatformContainer = request.app.state.container
    return OrganizationService(container)


@router.post("", response_model=OrganizationSummary, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    service: Annotated[OrganizationService, Depends(get_service)],
) -> OrganizationSummary:
    return service.create_organization(payload)


@router.get("", response_model=list[OrganizationSummary])
def list_organizations(
    service: Annotated[OrganizationService, Depends(get_service)],
) -> list[OrganizationSummary]:
    return service.list_organizations()


@router.get("/{organization_id}", response_model=OrganizationSummary)
def get_organization(
    organization_id: str,
    service: Annotated[OrganizationService, Depends(get_service)],
) -> OrganizationSummary:
    return service.get_organization(organization_id)


@router.post(
    "/{organization_id}/projects",
    response_model=ProjectSummary,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    organization_id: str,
    payload: ProjectCreate,
    service: Annotated[OrganizationService, Depends(get_service)],
) -> ProjectSummary:
    return service.create_project(organization_id, payload)


@router.get("/{organization_id}/projects", response_model=list[ProjectSummary])
def list_projects(
    organization_id: str,
    service: Annotated[OrganizationService, Depends(get_service)],
) -> list[ProjectSummary]:
    return service.list_projects(organization_id)


@router.get("/{organization_id}/projects/{project_id}", response_model=ProjectSummary)
def get_project(
    organization_id: str,
    project_id: str,
    service: Annotated[OrganizationService, Depends(get_service)],
) -> ProjectSummary:
    return service.get_project(organization_id, project_id)
