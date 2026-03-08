from __future__ import annotations

from sqlalchemy import select

from app.core.database import DatabaseManager, ModelArtifactRow, ModelDeploymentRow, ModelRow
from app.core.database import ModelVersionRow
from app.core.tenancy import TenantContext
from app.modules.model_registry.schemas import ModelArtifactSummary, ModelDeploymentSummary
from app.modules.model_registry.schemas import ModelSummary, ModelVersionSummary


def _model_to_schema(row: ModelRow) -> ModelSummary:
    return ModelSummary(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        type=row.type,
        framework=row.framework,
        description=row.description,
        lifecycle_state=row.lifecycle_state,
        created_at=row.created_at,
    )


def _version_to_schema(row: ModelVersionRow) -> ModelVersionSummary:
    return ModelVersionSummary(
        id=row.id,
        model_id=row.model_id,
        organization_id=row.organization_id,
        version=row.version,
        release_notes=row.release_notes,
        lifecycle_state=row.lifecycle_state,
        created_at=row.created_at,
    )


def _artifact_to_schema(row: ModelArtifactRow) -> ModelArtifactSummary:
    return ModelArtifactSummary(
        id=row.id,
        model_version_id=row.model_version_id,
        organization_id=row.organization_id,
        name=row.name,
        artifact_type=row.artifact_type,
        storage_backend=row.storage_backend,
        storage_path=row.storage_path,
        metadata=row.metadata_json,
        created_at=row.created_at,
    )


def _deployment_to_schema(row: ModelDeploymentRow) -> ModelDeploymentSummary:
    return ModelDeploymentSummary(
        id=row.id,
        model_version_id=row.model_version_id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        workspace_id=row.workspace_id,
        target=row.target,
        inference_url=row.inference_url,
        configuration=row.configuration_json,
        lifecycle_state=row.lifecycle_state,
        created_at=row.created_at,
    )


class ModelRegistryRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create_model(self, model: ModelSummary) -> ModelSummary:
        with self.database.session() as session:
            session.add(
                ModelRow(
                    id=model.id,
                    organization_id=model.organization_id,
                    name=model.name,
                    type=model.type,
                    framework=model.framework,
                    description=model.description,
                    lifecycle_state=model.lifecycle_state,
                    created_at=model.created_at,
                )
            )
        return model

    def list_models(self, tenant: TenantContext) -> list[ModelSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(ModelRow).where(ModelRow.organization_id == tenant.organization_id)
            ).all()
        return [_model_to_schema(row) for row in rows]

    def get_model(self, tenant: TenantContext, model_id: str) -> ModelSummary | None:
        with self.database.session() as session:
            row = session.scalar(
                select(ModelRow).where(
                    ModelRow.id == model_id,
                    ModelRow.organization_id == tenant.organization_id,
                )
            )
        return _model_to_schema(row) if row else None

    def create_version(self, version: ModelVersionSummary) -> ModelVersionSummary:
        with self.database.session() as session:
            session.add(
                ModelVersionRow(
                    id=version.id,
                    model_id=version.model_id,
                    organization_id=version.organization_id,
                    version=version.version,
                    release_notes=version.release_notes,
                    lifecycle_state=version.lifecycle_state,
                    created_at=version.created_at,
                )
            )
        return version

    def list_versions(self, tenant: TenantContext, model_id: str) -> list[ModelVersionSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(ModelVersionRow).where(
                    ModelVersionRow.model_id == model_id,
                    ModelVersionRow.organization_id == tenant.organization_id,
                )
            ).all()
        return [_version_to_schema(row) for row in rows]

    def get_version(self, tenant: TenantContext, version_id: str) -> ModelVersionSummary | None:
        with self.database.session() as session:
            row = session.scalar(
                select(ModelVersionRow).where(
                    ModelVersionRow.id == version_id,
                    ModelVersionRow.organization_id == tenant.organization_id,
                )
            )
        return _version_to_schema(row) if row else None

    def create_artifact(self, artifact: ModelArtifactSummary) -> ModelArtifactSummary:
        with self.database.session() as session:
            session.add(
                ModelArtifactRow(
                    id=artifact.id,
                    model_version_id=artifact.model_version_id,
                    organization_id=artifact.organization_id,
                    name=artifact.name,
                    artifact_type=artifact.artifact_type,
                    storage_backend=artifact.storage_backend,
                    storage_path=artifact.storage_path,
                    metadata_json=artifact.metadata,
                    created_at=artifact.created_at,
                )
            )
        return artifact

    def list_artifacts(
        self,
        tenant: TenantContext,
        version_id: str,
    ) -> list[ModelArtifactSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(ModelArtifactRow).where(
                    ModelArtifactRow.model_version_id == version_id,
                    ModelArtifactRow.organization_id == tenant.organization_id,
                )
            ).all()
        return [_artifact_to_schema(row) for row in rows]

    def create_deployment(self, deployment: ModelDeploymentSummary) -> ModelDeploymentSummary:
        with self.database.session() as session:
            session.add(
                ModelDeploymentRow(
                    id=deployment.id,
                    model_version_id=deployment.model_version_id,
                    organization_id=deployment.organization_id,
                    project_id=deployment.project_id,
                    workspace_id=deployment.workspace_id,
                    target=deployment.target,
                    inference_url=deployment.inference_url,
                    configuration_json=deployment.configuration,
                    lifecycle_state=deployment.lifecycle_state,
                    created_at=deployment.created_at,
                )
            )
        return deployment

    def list_deployments(
        self,
        tenant: TenantContext,
        version_id: str,
    ) -> list[ModelDeploymentSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(ModelDeploymentRow).where(
                    ModelDeploymentRow.model_version_id == version_id,
                    ModelDeploymentRow.organization_id == tenant.organization_id,
                    ModelDeploymentRow.project_id == tenant.project_id,
                )
            ).all()
        return [_deployment_to_schema(row) for row in rows]

    def count_deployments_for_workspace(self, tenant: TenantContext, workspace_id: str) -> int:
        with self.database.session() as session:
            rows = session.scalars(
                select(ModelDeploymentRow).where(
                    ModelDeploymentRow.organization_id == tenant.organization_id,
                    ModelDeploymentRow.project_id == tenant.project_id,
                    ModelDeploymentRow.workspace_id == workspace_id,
                )
            ).all()
        return len(rows)
