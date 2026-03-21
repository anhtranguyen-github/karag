from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException, status
from pydantic import ValidationError

from app.karag_manager import KaragManager
from app.core.events import TransactionalOutbox, WORKSPACE_UPDATED, build_event
from app.core.tenancy import TenantContext, require_workspace_scope
from app.modules.workspaces.schemas import (
    WorkspaceCreate,
    WorkspaceSetting,
    WorkspaceSettingUpdate,
    WorkspaceSummary,
)
from app.modules.workspaces.setting_manager import WorkspaceSettingManager


class WorkspaceService:
    def __init__(self, karag_manager: KaragManager) -> None:
        self.karag_manager = karag_manager

    def create_workspace(self, tenant: TenantContext, payload: WorkspaceCreate) -> WorkspaceSummary:
        from nanoid import generate as nanoid
        workspace_id = payload.id or nanoid()
        
        # Verify scope if provided in tenant context
        require_workspace_scope(tenant, workspace_id)

        if not self.karag_manager.organizations.get(tenant.organization_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found.",
            )
        if not self.karag_manager.projects.get(tenant.organization_id, tenant.project_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found.",
            )
        existing = self.karag_manager.workspaces.get(tenant, workspace_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Workspace already exists for this tenant.",
            )
        workspace = self.karag_manager.workspaces.create(
            WorkspaceSummary(
                id=workspace_id,
                organization_id=tenant.organization_id,
                project_id=tenant.project_id,
                name=payload.name,
                description=payload.description,
                status="active",
                created_at=datetime.now(UTC),
            )
        )
        default_setting = WorkspaceSettingManager.build_default(workspace_id=workspace.id)
        self.karag_manager.workspace_settings.upsert(tenant, default_setting)
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
        outbox.flush(self.karag_manager.event_bus)
        return workspace

    def list_workspaces(self, tenant: TenantContext) -> list[WorkspaceSummary]:
        return self.karag_manager.workspaces.list(tenant)

    def get_workspace(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSummary:
        workspace = self.karag_manager.workspaces.get(tenant, workspace_id)
        if not workspace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        require_workspace_scope(tenant, workspace.id)
        return workspace

    def ensure_workspace(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSummary:
        require_workspace_scope(tenant, workspace_id)
        workspace = self.karag_manager.workspaces.get(tenant, workspace_id)
        if not workspace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return workspace

    def get_rag_config(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSetting:
        workspace = self.ensure_workspace(tenant, workspace_id)
        config = self.karag_manager.workspace_settings.get(tenant, workspace.id)
        if config:
            return config
        config = WorkspaceSettingManager.build_default(workspace_id=workspace.id)
        return self.karag_manager.workspace_settings.upsert(tenant, config)

    def update_rag_config(
        self, tenant: TenantContext, workspace_id: str, payload: WorkspaceSettingUpdate
    ) -> WorkspaceSetting:
        workspace = self.ensure_workspace(tenant, workspace_id)
        current = self.get_rag_config(tenant, workspace.id)
        try:
            config = WorkspaceSettingManager.merge(current, payload)
        except ValidationError as exc:
            errors = [e["msg"] for e in exc.errors()]
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"message": "Invalid RAG component configuration.", "errors": errors},
            )

        saved = self.karag_manager.workspace_settings.upsert(tenant, config)
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
        outbox.flush(self.karag_manager.event_bus)
        return saved

    def delete_workspace(self, tenant: TenantContext, workspace_id: str) -> None:
        workspace = self.get_workspace(tenant, workspace_id)
        self.karag_manager.workspace_settings.delete(tenant, workspace.id)
        self.karag_manager.workspaces.delete(tenant, workspace.id)
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
        outbox.flush(self.karag_manager.event_bus)
