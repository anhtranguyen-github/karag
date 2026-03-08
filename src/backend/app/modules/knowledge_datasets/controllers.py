from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi import Request, Response, status

from app.core.container import PlatformContainer
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.knowledge_datasets.schemas import ChunkSummary, DocumentSummary
from app.modules.knowledge_datasets.schemas import DocumentUploadResponse, KnowledgeDatasetCreate
from app.modules.knowledge_datasets.schemas import KnowledgeDatasetDetail
from app.modules.knowledge_datasets.services import KnowledgeDatasetService


router = APIRouter(prefix="/api/v1/knowledge-datasets", tags=["knowledge-datasets"])


def get_service(request: Request) -> KnowledgeDatasetService:
    container: PlatformContainer = request.app.state.container
    return KnowledgeDatasetService(container)


@router.post("", response_model=KnowledgeDatasetDetail, status_code=status.HTTP_201_CREATED)
def create_knowledge_dataset(
    payload: KnowledgeDatasetCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[KnowledgeDatasetService, Depends(get_service)],
) -> KnowledgeDatasetDetail:
    dataset = service.create_dataset(tenant, payload)
    return service.get_dataset(tenant, dataset.id)


@router.get("", response_model=list[KnowledgeDatasetDetail])
def list_knowledge_datasets(
    workspace_id: Annotated[str, Query()],
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[KnowledgeDatasetService, Depends(get_service)],
) -> list[KnowledgeDatasetDetail]:
    return service.list_datasets(tenant, workspace_id)


@router.get("/{dataset_id}", response_model=KnowledgeDatasetDetail)
def get_knowledge_dataset(
    dataset_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[KnowledgeDatasetService, Depends(get_service)],
) -> KnowledgeDatasetDetail:
    return service.get_dataset(tenant, dataset_id)


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_dataset(
    dataset_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[KnowledgeDatasetService, Depends(get_service)],
) -> Response:
    service.delete_dataset(tenant, dataset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{dataset_id}/documents",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    dataset_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[KnowledgeDatasetService, Depends(get_service)],
    file: UploadFile = File(...),
) -> DocumentUploadResponse:
    return await service.upload_document(tenant, dataset_id, file)


@router.get("/{dataset_id}/documents", response_model=list[DocumentSummary])
def list_documents(
    dataset_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[KnowledgeDatasetService, Depends(get_service)],
) -> list[DocumentSummary]:
    return service.list_documents(tenant, dataset_id)


@router.get("/{dataset_id}/chunks", response_model=list[ChunkSummary])
def list_chunks(
    dataset_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[KnowledgeDatasetService, Depends(get_service)],
) -> list[ChunkSummary]:
    return service.list_chunks(tenant, dataset_id)
