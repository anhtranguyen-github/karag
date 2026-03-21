from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.evaluation_datasets.schemas import (
    EvaluationDatasetCreate,
    EvaluationDatasetSummary,
    EvaluationQuestionCreate,
    EvaluationQuestionSummary,
    EvaluationRunRequest,
    EvaluationRunResult,
)
from app.modules.evaluation_datasets.services import EvaluationDatasetService

router = APIRouter(prefix="/evaluation-datasets", tags=["evaluation-datasets"])


def get_service(request: Request) -> EvaluationDatasetService:
    karag_manager: KaragManager = request.app.state.karag_manager
    return karag_manager.evaluation_dataset_service


@router.post("", response_model=EvaluationDatasetSummary, status_code=status.HTTP_201_CREATED)
def create_dataset(
    payload: EvaluationDatasetCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> EvaluationDatasetSummary:
    return service.create_dataset(tenant, payload)


@router.get("", response_model=list[EvaluationDatasetSummary])
def list_datasets(
    workspace_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> list[EvaluationDatasetSummary]:
    return service.list_datasets(tenant, workspace_id)


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> Response:
    service.delete_dataset(tenant, dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{dataset_id}/questions", response_model=list[EvaluationQuestionSummary])
def list_questions(
    dataset_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> list[EvaluationQuestionSummary]:
    return service.list_questions(tenant, dataset_id)


@router.post(
    "/{dataset_id}/questions",
    response_model=EvaluationQuestionSummary,
    status_code=status.HTTP_201_CREATED,
)
def create_question(
    dataset_id: str,
    payload: EvaluationQuestionCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> EvaluationQuestionSummary:
    return service.create_question(tenant, dataset_id, payload)


@router.post("/{dataset_id}/run", response_model=EvaluationRunResult)
async def run_evaluation(
    dataset_id: str,
    payload: EvaluationRunRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> EvaluationRunResult:
    return await service.run_evaluation(tenant, dataset_id, payload)
