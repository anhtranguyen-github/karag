from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.core.container import PlatformContainer
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.model_registry.schemas import ModelArtifactCreate, ModelArtifactSummary
from app.modules.model_registry.schemas import ModelCreate, ModelDeploymentCreate
from app.modules.model_registry.schemas import ModelDeploymentSummary, ModelSummary
from app.modules.model_registry.schemas import ModelVersionCreate, ModelVersionSummary
from app.modules.model_registry.services import ModelRegistryService


router = APIRouter(prefix="/api/v1", tags=["model-registry"])


def get_service(request: Request) -> ModelRegistryService:
    container: PlatformContainer = request.app.state.container
    return ModelRegistryService(container)


@router.post("/models", response_model=ModelSummary, status_code=status.HTTP_201_CREATED)
def create_model(
    payload: ModelCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ModelRegistryService, Depends(get_service)],
) -> ModelSummary:
    return service.create_model(tenant, payload)


@router.get("/models", response_model=list[ModelSummary])
def list_models(
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ModelRegistryService, Depends(get_service)],
) -> list[ModelSummary]:
    return service.list_models(tenant)


@router.post(
    "/models/{model_id}/versions",
    response_model=ModelVersionSummary,
    status_code=status.HTTP_201_CREATED,
)
def create_model_version(
    model_id: str,
    payload: ModelVersionCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ModelRegistryService, Depends(get_service)],
) -> ModelVersionSummary:
    return service.create_version(tenant, model_id, payload)


@router.get("/models/{model_id}/versions", response_model=list[ModelVersionSummary])
def list_model_versions(
    model_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ModelRegistryService, Depends(get_service)],
) -> list[ModelVersionSummary]:
    return service.list_versions(tenant, model_id)


@router.post(
    "/model-versions/{version_id}/artifacts",
    response_model=ModelArtifactSummary,
    status_code=status.HTTP_201_CREATED,
)
def create_model_artifact(
    version_id: str,
    payload: ModelArtifactCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ModelRegistryService, Depends(get_service)],
) -> ModelArtifactSummary:
    return service.create_artifact(tenant, version_id, payload)


@router.get("/model-versions/{version_id}/artifacts", response_model=list[ModelArtifactSummary])
def list_model_artifacts(
    version_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ModelRegistryService, Depends(get_service)],
) -> list[ModelArtifactSummary]:
    return service.list_artifacts(tenant, version_id)


@router.post(
    "/model-versions/{version_id}/deployments",
    response_model=ModelDeploymentSummary,
    status_code=status.HTTP_201_CREATED,
)
def create_model_deployment(
    version_id: str,
    payload: ModelDeploymentCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ModelRegistryService, Depends(get_service)],
) -> ModelDeploymentSummary:
    return service.create_deployment(tenant, version_id, payload)


@router.get(
    "/model-versions/{version_id}/deployments",
    response_model=list[ModelDeploymentSummary],
)
def list_model_deployments(
    version_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ModelRegistryService, Depends(get_service)],
) -> list[ModelDeploymentSummary]:
    return service.list_deployments(tenant, version_id)
