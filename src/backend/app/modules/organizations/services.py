from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from app.modules.organizations.schemas import DocumentStorageConfig
from app.modules.organizations.schemas import OrganizationCreate, OrganizationSummary, OrganizationUpdate
from app.modules.organizations.schemas import ProjectCreate, ProjectSummary, ProjectUpdate
from app.core.tenancy import TenantContext


class OrganizationService:
    def __init__(self, karag_manager: Any) -> None:
        self.karag_manager = karag_manager

    def _default_storage_config(self) -> DocumentStorageConfig:
        settings = self.karag_manager.settings
        return DocumentStorageConfig(
            provider=settings.default_storage_provider,
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            bucket=settings.minio_bucket,
            secure=settings.minio_secure,
        )

    def create_organization(self, payload: OrganizationCreate, actor_id: str | None = None) -> OrganizationSummary:
        from nanoid import generate as nanoid
        org_id = payload.id or nanoid()
        existing = self.karag_manager.organizations.get(org_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Organization already exists.",
            )
        organization = self.karag_manager.organizations.create(
            OrganizationSummary(
                id=org_id,
                name=payload.name,
                description=payload.description,
                status="active",
                created_at=datetime.now(UTC),
            )
        )
        if actor_id:
            self.karag_manager.auth_service.attach_role_to_user(
                user_id=actor_id,
                organization_id=organization.id,
                role_name="admin",
            )
        return organization

    def list_organizations(self, tenant: TenantContext) -> list[OrganizationSummary]:
        if "org.view" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return self.karag_manager.organizations.list()

    def list_visible_organizations(self, actor_id: str) -> list[OrganizationSummary]:
        memberships = self.karag_manager.memberships.list_user_memberships(actor_id)
        organization_ids = {membership.organization_id for membership in memberships}
        return [
            organization
            for organization in self.karag_manager.organizations.list()
            if organization.id in organization_ids
        ]

    def get_organization(self, tenant: TenantContext, organization_id: str) -> OrganizationSummary:
        if "org.view" not in tenant.permissions or tenant.organization_id != organization_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
             
        organization = self.karag_manager.organizations.get(organization_id)
        if not organization:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        return organization

    def get_organization_for_actor(self, actor_id: str, organization_id: str) -> OrganizationSummary:
        permissions = self.karag_manager.access_service.get_effective_permissions(actor_id, organization_id)
        if "org.view" not in permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        organization = self.karag_manager.organizations.get(organization_id)
        if not organization:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        return organization

    def create_project_for_actor(self, actor_id: str, organization_id: str, payload: ProjectCreate) -> ProjectSummary:
        permissions = self.karag_manager.access_service.get_effective_permissions(actor_id, organization_id)
        if "project.create" not in permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        organization = self.karag_manager.organizations.get(organization_id)
        if not organization:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        from nanoid import generate as nanoid
        project_id = payload.id or nanoid()
        existing = self.karag_manager.projects.get(organization.id, project_id)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Project already exists.")
        from app.core.encryption import encrypt_secret
        storage_config = (payload.document_storage_config or self._default_storage_config()).model_copy()
        storage_config.access_key = encrypt_secret(storage_config.access_key)
        storage_config.secret_key = encrypt_secret(storage_config.secret_key)

        return self.karag_manager.projects.create(
            ProjectSummary(
                id=project_id,
                organization_id=organization.id,
                name=payload.name,
                description=payload.description,
                document_storage_config=storage_config,
                status="active",
                created_at=datetime.now(UTC),
            )
        )

    def list_projects(self, tenant: TenantContext, organization_id: str) -> list[ProjectSummary]:
        if "project.view" not in tenant.permissions or tenant.organization_id != organization_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
             
        self.get_organization(tenant, organization_id)
        return self.karag_manager.projects.list_for_organization(organization_id)

    def list_visible_projects(self, actor_id: str, organization_id: str) -> list[ProjectSummary]:
        permissions = self.karag_manager.access_service.get_effective_permissions(actor_id, organization_id)
        if "project.view" not in permissions and "org.view" not in permissions:
            return []

        memberships = self.karag_manager.memberships.list_user_memberships(actor_id)
        org_membership = any(
            membership.organization_id == organization_id and membership.project_id is None
            for membership in memberships
        )
        all_projects = self.karag_manager.projects.list_for_organization(organization_id)
        if org_membership:
            return all_projects

        visible_project_ids = {
            membership.project_id
            for membership in memberships
            if membership.organization_id == organization_id and membership.project_id
        }
        return [project for project in all_projects if project.id in visible_project_ids]

    def get_project(self, tenant: TenantContext, organization_id: str, project_id: str) -> ProjectSummary:
        if "project.view" not in tenant.permissions or tenant.organization_id != organization_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
             
        project = self.karag_manager.projects.get(organization_id, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return project

    def update_project(
        self, tenant: TenantContext, organization_id: str, project_id: str, payload: ProjectUpdate
    ) -> ProjectSummary:
        if "project.edit" not in tenant.permissions or tenant.organization_id != organization_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
             
        project = self.get_project(tenant, organization_id, project_id)
        
        if payload.name is not None:
            project.name = payload.name
        if payload.description is not None:
            project.description = payload.description
        if payload.status is not None:
            project.status = payload.status
        if payload.document_storage_config is not None:
            from app.core.encryption import encrypt_secret
            storage_config = payload.document_storage_config.model_copy()
            storage_config.access_key = encrypt_secret(storage_config.access_key)
            storage_config.secret_key = encrypt_secret(storage_config.secret_key)
            project.document_storage_config = storage_config

        return self.karag_manager.projects.update(project)

    def update_organization(
        self, actor_id: str, organization_id: str, payload: OrganizationUpdate
    ) -> OrganizationSummary:
        permissions = self.karag_manager.access_service.get_effective_permissions(actor_id, organization_id)
        if "org.edit" not in permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        organization = self.karag_manager.organizations.get(organization_id)
        if not organization:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        if payload.name is not None:
            organization.name = payload.name
        if payload.description is not None:
            organization.description = payload.description
        if payload.status is not None:
            organization.status = payload.status
        return self.karag_manager.organizations.update(organization)
