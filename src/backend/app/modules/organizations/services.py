from __future__ import annotations

from fastapi import HTTPException, status

from app.core.container import PlatformContainer
from app.modules.organizations.schemas import OrganizationCreate, OrganizationSummary
from app.modules.organizations.schemas import ProjectCreate, ProjectSummary


class OrganizationService:
    def __init__(self, container: PlatformContainer) -> None:
        self.container = container

    def create_organization(self, payload: OrganizationCreate) -> OrganizationSummary:
        existing = self.container.organizations.get(payload.id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Organization already exists.",
            )
        return self.container.organizations.create(
            OrganizationSummary(
                id=payload.id,
                name=payload.name,
                description=payload.description,
            )
        )

    def list_organizations(self) -> list[OrganizationSummary]:
        return self.container.organizations.list()

    def get_organization(self, organization_id: str) -> OrganizationSummary:
        organization = self.container.organizations.get(organization_id)
        if not organization:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        return organization

    def create_project(self, organization_id: str, payload: ProjectCreate) -> ProjectSummary:
        organization = self.get_organization(organization_id)
        existing = self.container.projects.get(organization.id, payload.id)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Project already exists.")
        return self.container.projects.create(
            ProjectSummary(
                id=payload.id,
                organization_id=organization.id,
                name=payload.name,
                description=payload.description,
            )
        )

    def list_projects(self, organization_id: str) -> list[ProjectSummary]:
        self.get_organization(organization_id)
        return self.container.projects.list_for_organization(organization_id)

    def get_project(self, organization_id: str, project_id: str) -> ProjectSummary:
        project = self.container.projects.get(organization_id, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return project
