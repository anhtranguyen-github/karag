from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from app.modules.organizations.schemas import DocumentStorageConfig
from app.modules.organizations.schemas import OrganizationCreate, OrganizationSummary
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

    def create_organization(self, payload: OrganizationCreate) -> OrganizationSummary:
        from nanoid import generate as nanoid
        org_id = payload.id or nanoid()
        existing = self.karag_manager.organizations.get(org_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Organization already exists.",
            )
        return self.karag_manager.organizations.create(
            OrganizationSummary(
                id=org_id,
                name=payload.name,
                description=payload.description,
                status="active",
                created_at=datetime.now(UTC),
            )
        )

    def list_organizations(self, tenant: TenantContext) -> list[OrganizationSummary]:
        if "org.view" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return self.karag_manager.organizations.list()

    def list_all_organizations(self) -> list[OrganizationSummary]:
        """Discovery endpoint — returns all orgs (no tenant scope required)."""
        return self.karag_manager.organizations.list()

    def get_organization(self, tenant: TenantContext, organization_id: str) -> OrganizationSummary:
        if "org.view" not in tenant.permissions or tenant.organization_id != organization_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
             
        organization = self.karag_manager.organizations.get(organization_id)
        if not organization:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        return organization

    def create_project(self, organization_id: str, payload: ProjectCreate) -> ProjectSummary:
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

    def list_all_projects(self, organization_id: str) -> list[ProjectSummary]:
        """Discovery endpoint — returns all projects for an org (no tenant scope required)."""
        org = self.karag_manager.organizations.get(organization_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        return self.karag_manager.projects.list_for_organization(organization_id)

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
