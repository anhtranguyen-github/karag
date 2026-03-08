from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response, status

from app.core.container import PlatformContainer
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.evaluation_datasets.schemas import EvaluationDatasetCreate
from app.modules.evaluation_datasets.schemas import EvaluationDatasetSummary
from app.modules.evaluation_datasets.schemas import EvaluationQuestionCreate
from app.modules.evaluation_datasets.schemas import EvaluationQuestionSummary, EvaluationRunRequest
from app.modules.evaluation_datasets.schemas import EvaluationRunResult
from app.modules.evaluation_datasets.services import EvaluationDatasetService


router = APIRouter(prefix="/api/v1/evaluation-datasets", tags=["evaluation-datasets"])


def get_service(request: Request) -> EvaluationDatasetService:
    container: PlatformContainer = request.app.state.container
    return EvaluationDatasetService(container)


@router.post("", response_model=EvaluationDatasetSummary, status_code=status.HTTP_201_CREATED)
def create_evaluation_dataset(
    payload: EvaluationDatasetCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> EvaluationDatasetSummary:
    return service.create_dataset(tenant, payload)


@router.get("", response_model=list[EvaluationDatasetSummary])
def list_evaluation_datasets(
    workspace_id: Annotated[str, Query()],
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> list[EvaluationDatasetSummary]:
    return service.list_datasets(tenant, workspace_id)


@router.get("/{dataset_id}", response_model=EvaluationDatasetSummary)
def get_evaluation_dataset(
    dataset_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> EvaluationDatasetSummary:
    return service.get_dataset(tenant, dataset_id)


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evaluation_dataset(
    dataset_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> Response:
    service.delete_dataset(tenant, dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{dataset_id}/questions",
    response_model=EvaluationQuestionSummary,
    status_code=status.HTTP_201_CREATED,
)
def add_question(
    dataset_id: str,
    payload: EvaluationQuestionCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> EvaluationQuestionSummary:
    return service.add_question(tenant, dataset_id, payload)


@router.get("/{dataset_id}/questions", response_model=list[EvaluationQuestionSummary])
def list_questions(
    dataset_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> list[EvaluationQuestionSummary]:
    return service.list_questions(tenant, dataset_id)


@router.post("/{dataset_id}/run", response_model=EvaluationRunResult)
def run_evaluation(
    dataset_id: str,
    payload: EvaluationRunRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[EvaluationDatasetService, Depends(get_service)],
) -> EvaluationRunResult:
    return service.run_evaluation(tenant, dataset_id, payload)
