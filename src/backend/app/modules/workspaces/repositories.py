from __future__ import annotations

from sqlalchemy import delete, select

from app.core.database import DatabaseManager, WorkspaceRagConfigRow, WorkspaceRow
from app.core.tenancy import TenantContext
from app.modules.workspaces.schemas import WorkspaceRagConfig, WorkspaceSummary


def _workspace_to_schema(row: WorkspaceRow) -> WorkspaceSummary:
    return WorkspaceSummary(
        id=row.id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        name=row.name,
        description=row.description,
        created_at=row.created_at,
    )


class WorkspaceRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create(self, workspace: WorkspaceSummary) -> WorkspaceSummary:
        with self.database.session() as session:
            session.add(
                WorkspaceRow(
                    id=workspace.id,
                    organization_id=workspace.organization_id,
                    project_id=workspace.project_id,
                    name=workspace.name,
                    description=workspace.description,
                    created_at=workspace.created_at,
                )
            )
        return workspace

    def list(self, tenant: TenantContext) -> list[WorkspaceSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(WorkspaceRow).where(
                    WorkspaceRow.organization_id == tenant.organization_id,
                    WorkspaceRow.project_id == tenant.project_id,
                )
            ).all()
        return [_workspace_to_schema(row) for row in rows]

    def get(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSummary | None:
        with self.database.session() as session:
            row = session.scalar(
                select(WorkspaceRow).where(
                    WorkspaceRow.id == workspace_id,
                    WorkspaceRow.organization_id == tenant.organization_id,
                    WorkspaceRow.project_id == tenant.project_id,
                )
            )
        return _workspace_to_schema(row) if row else None

    def delete(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSummary | None:
        workspace = self.get(tenant, workspace_id)
        if not workspace:
            return None
        with self.database.session() as session:
            session.execute(delete(WorkspaceRow).where(WorkspaceRow.id == workspace_id))
        return workspace


class WorkspaceRagConfigRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def get(self, tenant: TenantContext, workspace_id: str) -> WorkspaceRagConfig | None:
        with self.database.session() as session:
            row = session.scalar(
                select(WorkspaceRagConfigRow).where(
                    WorkspaceRagConfigRow.workspace_id == workspace_id,
                    WorkspaceRagConfigRow.organization_id == tenant.organization_id,
                    WorkspaceRagConfigRow.project_id == tenant.project_id,
                )
            )
        if not row:
            return None
        return WorkspaceRagConfig(
            workspace_id=row.workspace_id,
            organization_id=row.organization_id,
            project_id=row.project_id,
            embedding_provider=row.embedding_provider,
            embedding_model=row.embedding_model,
            embedding_dimension=row.embedding_dimension,
            embedding_batch_size=row.embedding_batch_size,
            vector_store_type=row.vector_store_type,
            vector_store_config=row.vector_store_config_json,
            retrieval_config=row.retrieval_config_json,
            reading_config=row.reading_config_json,
            llm_config=row.llm_config_json,
            prompt_template=row.prompt_template,
            updated_at=row.updated_at,
        )

    def upsert(self, config: WorkspaceRagConfig) -> WorkspaceRagConfig:
        with self.database.session() as session:
            row = session.scalar(
                select(WorkspaceRagConfigRow).where(
                    WorkspaceRagConfigRow.workspace_id == config.workspace_id,
                    WorkspaceRagConfigRow.organization_id == config.organization_id,
                    WorkspaceRagConfigRow.project_id == config.project_id,
                )
            )
            if not row:
                row = WorkspaceRagConfigRow(
                    workspace_id=config.workspace_id,
                    organization_id=config.organization_id,
                    project_id=config.project_id,
                )
                session.add(row)

            row.embedding_provider = config.embedding_provider
            row.embedding_model = config.embedding_model
            row.embedding_dimension = config.embedding_dimension
            row.embedding_batch_size = config.embedding_batch_size
            row.vector_store_type = config.vector_store_type
            row.vector_store_config_json = config.vector_store_config.model_dump()
            row.retrieval_config_json = config.retrieval_config.model_dump()
            row.reading_config_json = config.reading_config.model_dump()
            row.llm_config_json = config.llm_config.model_dump()
            row.prompt_template = config.prompt_template
            row.updated_at = config.updated_at
        return config

    def delete(self, tenant: TenantContext, workspace_id: str) -> None:
        with self.database.session() as session:
            session.execute(
                delete(WorkspaceRagConfigRow).where(
                    WorkspaceRagConfigRow.workspace_id == workspace_id,
                    WorkspaceRagConfigRow.organization_id == tenant.organization_id,
                    WorkspaceRagConfigRow.project_id == tenant.project_id,
                )
            )
