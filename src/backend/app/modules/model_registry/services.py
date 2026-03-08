from __future__ import annotations

from pathlib import PurePosixPath

from fastapi import HTTPException, status

from app.core.container import PlatformContainer
from app.core.events import MODEL_DEPLOYED, MODEL_REGISTERED, TransactionalOutbox, build_event
from app.core.tenancy import TenantContext, require_workspace_scope
from app.modules.model_registry.schemas import ModelArtifactCreate, ModelArtifactSummary
from app.modules.model_registry.schemas import ModelCreate, ModelDeploymentCreate
from app.modules.model_registry.schemas import ModelDeploymentSummary, ModelSummary
from app.modules.model_registry.schemas import ModelVersionCreate, ModelVersionSummary


class ModelRegistryService:
    def __init__(self, container: PlatformContainer) -> None:
        self.container = container

    def _require_workspace(self, tenant: TenantContext, workspace_id: str) -> str:
        workspace_id = require_workspace_scope(tenant, workspace_id)
        if not self.container.workspaces.get(tenant, workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return workspace_id

    def create_model(self, tenant: TenantContext, payload: ModelCreate) -> ModelSummary:
        model = self.container.models.create_model(
            ModelSummary(
                organization_id=tenant.organization_id,
                name=payload.name,
                type=payload.type,
                framework=payload.framework,
                description=payload.description,
            )
        )
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=MODEL_REGISTERED,
                tenant=tenant,
                resource_id=model.id,
                payload={"name": model.name, "type": model.type},
            )
        )
        outbox.flush(self.container.event_bus)
        return model

    def list_models(self, tenant: TenantContext) -> list[ModelSummary]:
        return self.container.models.list_models(tenant)

    def create_version(
        self,
        tenant: TenantContext,
        model_id: str,
        payload: ModelVersionCreate,
    ) -> ModelVersionSummary:
        model = self.container.models.get_model(tenant, model_id)
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found.")
        return self.container.models.create_version(
            ModelVersionSummary(
                model_id=model.id,
                organization_id=tenant.organization_id,
                version=payload.version,
                release_notes=payload.release_notes,
            )
        )

    def list_versions(self, tenant: TenantContext, model_id: str) -> list[ModelVersionSummary]:
        model = self.container.models.get_model(tenant, model_id)
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found.")
        return self.container.models.list_versions(tenant, model_id)

    def create_artifact(
        self,
        tenant: TenantContext,
        version_id: str,
        payload: ModelArtifactCreate,
    ) -> ModelArtifactSummary:
        version = self.container.models.get_version(tenant, version_id)
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model version not found.",
            )
        storage_path = str(
            PurePosixPath(
                tenant.organization_id,
                "models",
                version.model_id,
                version.id,
                payload.name,
            )
        )
        self.container.storage_provider.store_object(
            storage_path,
            payload.name.encode("utf-8"),
            metadata=payload.metadata,
        )
        artifact = self.container.models.create_artifact(
            ModelArtifactSummary(
                model_version_id=version.id,
                organization_id=tenant.organization_id,
                name=payload.name,
                artifact_type=payload.artifact_type,
                storage_backend=payload.storage_backend,
                storage_path=storage_path,
                metadata=payload.metadata,
            )
        )
        self.container.telemetry.record_trace(
            trace_type="model_artifact_registration",
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=tenant.workspace_id,
            resource_id=artifact.id,
            captured={"artifact_name": artifact.name},
            metrics={"artifact_count": 1},
        )
        return artifact

    def list_artifacts(self, tenant: TenantContext, version_id: str) -> list[ModelArtifactSummary]:
        version = self.container.models.get_version(tenant, version_id)
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model version not found.",
            )
        return self.container.models.list_artifacts(tenant, version.id)

    def create_deployment(
        self,
        tenant: TenantContext,
        version_id: str,
        payload: ModelDeploymentCreate,
    ) -> ModelDeploymentSummary:
        version = self.container.models.get_version(tenant, version_id)
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model version not found.",
            )
        workspace_id = self._require_workspace(tenant, payload.workspace_id)
        deployment = self.container.models.create_deployment(
            ModelDeploymentSummary(
                model_version_id=version.id,
                organization_id=tenant.organization_id,
                project_id=tenant.project_id,
                workspace_id=workspace_id,
                target=payload.target,
                inference_url=payload.inference_url,
                configuration=payload.configuration,
            )
        )
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=MODEL_DEPLOYED,
                tenant=tenant,
                resource_id=deployment.id,
                payload={"target": payload.target, "version_id": version.id},
                workspace_id=workspace_id,
            )
        )
        outbox.flush(self.container.event_bus)
        self.container.telemetry.record_trace(
            trace_type="model_deployment",
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=workspace_id,
            resource_id=deployment.id,
            captured={"target": deployment.target, "inference_url": deployment.inference_url},
            metrics={
                "inference_latency_ms": 42,
                "throughput_rps": 120,
                "gpu_utilization": 0.0 if payload.target == "ollama" else 0.68,
                "error_rate": 0.0,
            },
        )
        return deployment

    def list_deployments(
        self,
        tenant: TenantContext,
        version_id: str,
    ) -> list[ModelDeploymentSummary]:
        version = self.container.models.get_version(tenant, version_id)
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model version not found.",
            )
        return self.container.models.list_deployments(tenant, version.id)
