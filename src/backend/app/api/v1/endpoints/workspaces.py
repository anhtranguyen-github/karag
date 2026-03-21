from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel, Field, ValidationError

from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.workspaces.schemas import (
    WorkspaceCreate,
    WorkspaceSetting,
    WorkspaceSettingUpdate,
    WorkspaceSummary,
)
from app.modules.workspaces.services import WorkspaceService


router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def get_service(request: Request) -> WorkspaceService:
    karag_manager: KaragManager = request.app.state.karag_manager
    return WorkspaceService(karag_manager)


@router.post("", response_model=WorkspaceSummary, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> WorkspaceSummary:
    return service.create_workspace(tenant, payload)


@router.get("", response_model=list[WorkspaceSummary])
def list_workspaces(
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> list[WorkspaceSummary]:
    return service.list_workspaces(tenant)


@router.get("/{workspace_id}", response_model=WorkspaceSummary)
def get_workspace(
    workspace_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> WorkspaceSummary:
    return service.get_workspace(tenant, workspace_id)


@router.get("/{workspace_id}/rag-config", response_model=WorkspaceSetting)
def get_workspace_rag_config(
    workspace_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> WorkspaceSetting:
    return service.get_rag_config(tenant, workspace_id)


@router.put("/{workspace_id}/rag-config", response_model=WorkspaceSetting)
def update_workspace_rag_config(
    workspace_id: str,
    payload: WorkspaceSettingUpdate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> WorkspaceSetting:
    return service.update_rag_config(tenant, workspace_id, payload)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> Response:
    service.delete_workspace(tenant, workspace_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Pipeline audit & validate ──


class RagPipelineCompatibilityCheck(BaseModel):
    name: str
    status: str  # "ok" | "warning" | "error"
    message: str


class RagPipelineComponentMetadata(BaseModel):
    implementation: str
    enabled: bool
    details: dict[str, Any] = Field(default_factory=dict)


class RagPipelineAudit(BaseModel):
    valid: bool
    current_pipeline: dict[str, str]
    pipeline_graph: list[str]
    compatibility: list[RagPipelineCompatibilityCheck]
    components: dict[str, RagPipelineComponentMetadata]
    available_components: dict[str, list[str]]


def _build_audit(setting: WorkspaceSetting, available_components: dict[str, list[str]]) -> RagPipelineAudit:
    """Build an audit report for the given workspace setting."""
    current = {
        "reader": setting.rag.reader,
        "embedder": setting.embedding.component,
        "chunker": "recursive",
        "vectorstore": setting.vectorstore.component,
        "retriever": setting.retriever.component,
        "reranker": setting.reranker.component,
        "query_transformer": setting.rag.query_transformer,
        "generator": setting.rag.generator,
    }

    graph = [
        f"query → {current['query_transformer']}",
        f"{current['query_transformer']} → {current['embedder']}",
        f"{current['embedder']} → {current['vectorstore']}",
        f"{current['vectorstore']} → {current['retriever']}",
        f"{current['retriever']} → {current['reranker']}",
        f"{current['reranker']} → {current['generator']}",
        f"{current['generator']} → answer",
    ]

    compatibility: list[RagPipelineCompatibilityCheck] = []
    valid = True

    # Run the model validator to check compatibility
    try:
        setting.check_component_compatibility()
        compatibility.append(RagPipelineCompatibilityCheck(
            name="embedding-vectorstore", status="ok",
            message=f"'{setting.embedding.component}' embedding is compatible with '{setting.vectorstore.component}' vectorstore",
        ))
    except ValueError as exc:
        valid = False
        for msg in str(exc).split("; "):
            compatibility.append(RagPipelineCompatibilityCheck(
                name="component-compatibility", status="error", message=msg,
            ))

    # Check that configured components are actually registered
    for role, name in current.items():
        avail = available_components.get(role, [])
        if avail and name not in avail:
            valid = False
            compatibility.append(RagPipelineCompatibilityCheck(
                name=f"{role}-available", status="error",
                message=f"'{name}' is not a registered {role}. Available: {avail}",
            ))

    components = {
        role: RagPipelineComponentMetadata(
            implementation=name, enabled=True, details={},
        )
        for role, name in current.items()
    }

    return RagPipelineAudit(
        valid=valid,
        current_pipeline=current,
        pipeline_graph=graph,
        compatibility=compatibility,
        components=components,
        available_components=available_components,
    )


@router.get("/{workspace_id}/rag-pipeline/audit", response_model=RagPipelineAudit)
def get_workspace_rag_pipeline_audit(
    workspace_id: str,
    request: Request,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> RagPipelineAudit:
    karag_manager: KaragManager = request.app.state.karag_manager
    setting = service.get_rag_config(tenant, workspace_id)
    available = karag_manager.list_available_components()
    return _build_audit(setting, available)


@router.post("/{workspace_id}/rag-pipeline/validate", response_model=RagPipelineAudit)
def validate_workspace_rag_pipeline(
    workspace_id: str,
    payload: WorkspaceSettingUpdate,
    request: Request,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[WorkspaceService, Depends(get_service)],
) -> RagPipelineAudit:
    karag_manager: KaragManager = request.app.state.karag_manager
    current = service.get_rag_config(tenant, workspace_id)

    # Merge the proposed changes into the current setting
    merged = current.model_dump()
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if isinstance(value, dict) and key in merged and isinstance(merged[key], dict):
            merged[key].update(value)
        else:
            merged[key] = value

    try:
        proposed = WorkspaceSetting(**merged)
    except ValidationError:
        proposed = current

    available = karag_manager.list_available_components()
    return _build_audit(proposed, available)
