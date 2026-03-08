from __future__ import annotations

from fastapi import HTTPException, status

from app.core.container import PlatformContainer
from app.core.events import TransactionalOutbox, WORKSPACE_UPDATED, build_event
from app.core.tenancy import TenantContext, require_workspace_scope
from app.modules.workspaces.schemas import (
    WorkspaceCreate,
    WorkspaceRagConfig,
    WorkspaceRagConfigUpdate,
    WorkspaceSummary,
    build_default_workspace_rag_config,
)


class WorkspaceService:
    def __init__(self, container: PlatformContainer) -> None:
        self.container = container

    def create_workspace(self, tenant: TenantContext, payload: WorkspaceCreate) -> WorkspaceSummary:
        workspace_id = require_workspace_scope(tenant, payload.id)
        if not self.container.organizations.get(tenant.organization_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found.",
            )
        if not self.container.projects.get(tenant.organization_id, tenant.project_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found.",
            )
        existing = self.container.workspaces.get(tenant, workspace_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Workspace already exists for this tenant.",
            )
        workspace = self.container.workspaces.create(
            WorkspaceSummary(
                id=workspace_id,
                organization_id=tenant.organization_id,
                project_id=tenant.project_id,
                name=payload.name,
                description=payload.description,
            )
        )
        self.container.workspace_rag_configs.upsert(
            build_default_workspace_rag_config(
                workspace_id=workspace.id,
                organization_id=tenant.organization_id,
                project_id=tenant.project_id,
            )
        )
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=WORKSPACE_UPDATED,
                tenant=tenant,
                resource_id=workspace.id,
                payload={"action": "created"},
                workspace_id=workspace.id,
            )
        )
        outbox.flush(self.container.event_bus)
        return workspace

    def list_workspaces(self, tenant: TenantContext) -> list[WorkspaceSummary]:
        return self.container.workspaces.list(tenant)

    def get_workspace(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSummary:
        workspace = self.container.workspaces.get(tenant, workspace_id)
        if not workspace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        require_workspace_scope(tenant, workspace.id)
        return workspace

    def ensure_workspace(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSummary:
        require_workspace_scope(tenant, workspace_id)
        workspace = self.container.workspaces.get(tenant, workspace_id)
        if not workspace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return workspace

    def get_rag_config(self, tenant: TenantContext, workspace_id: str) -> WorkspaceRagConfig:
        workspace = self.ensure_workspace(tenant, workspace_id)
        config = self.container.workspace_rag_configs.get(tenant, workspace.id)
        if config:
            return config
        config = build_default_workspace_rag_config(
            workspace_id=workspace.id,
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
        )
        return self.container.workspace_rag_configs.upsert(config)

    def update_rag_config(
        self, tenant: TenantContext, workspace_id: str, payload: WorkspaceRagConfigUpdate
    ) -> WorkspaceRagConfig:
        workspace = self.ensure_workspace(tenant, workspace_id)
        config = WorkspaceRagConfig(
            workspace_id=workspace.id,
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            **payload.model_dump(),
        )
        saved = self.container.workspace_rag_configs.upsert(config)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=WORKSPACE_UPDATED,
                tenant=tenant,
                resource_id=workspace.id,
                payload={"action": "rag_config_updated"},
                workspace_id=workspace.id,
            )
        )
        outbox.flush(self.container.event_bus)
        return saved

    def delete_workspace(self, tenant: TenantContext, workspace_id: str) -> None:
        workspace = self.get_workspace(tenant, workspace_id)
        if self.container.knowledge_datasets.list(tenant, workspace.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Workspace still contains knowledge datasets.",
            )
        if self.container.evaluation_datasets.list_datasets(tenant, workspace.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Workspace still contains evaluation datasets.",
            )
        if self.container.models.count_deployments_for_workspace(tenant, workspace.id) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Workspace still contains model deployments.",
            )
        self.container.workspace_rag_configs.delete(tenant, workspace.id)
        self.container.workspaces.delete(tenant, workspace.id)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=WORKSPACE_UPDATED,
                tenant=tenant,
                resource_id=workspace.id,
                payload={"action": "deleted"},
                workspace_id=workspace.id,
            )
        )
        outbox.flush(self.container.event_bus)
