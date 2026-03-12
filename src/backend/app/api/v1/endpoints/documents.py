from __future__ import annotations
from typing import Annotated
from fastapi import APIRouter, Depends, File, Header, Query, Request, Response, UploadFile, status
from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.documents.schemas import DocumentIngestionResponse, DocumentSummary
from app.modules.documents.services import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])

def get_service(request: Request) -> DocumentService:
    karag_manager: KaragManager = request.app.state.karag_manager
    return karag_manager.document_service

@router.post(
    "/upload",
    response_model=DocumentSummary | DocumentIngestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    project_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[DocumentService, Depends(get_service)],
    file: UploadFile = File(...),
    workspace_id: str | None = Query(None),
    upload_id: Annotated[str | None, Header(alias="X-Upload-Id")] = None,
) -> DocumentSummary | DocumentIngestionResponse:
    """
    Upload a document to a project, optionally scoped to a workspace.
    When workspace_id is provided, the document is associated with that workspace
    and automatically ingested into its RAG pipeline.
    """
    return await service.upload_document(
        tenant,
        project_id,
        file,
        workspace_id=workspace_id,
        track_id=upload_id,
    )

@router.get("", response_model=list[DocumentSummary])
async def list_documents(
    project_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[DocumentService, Depends(get_service)],
    workspace_id: str | None = Query(None),
) -> list[DocumentSummary]:
    if workspace_id:
        return service.list_workspace_documents(tenant, project_id, workspace_id)
    return service.list_documents(tenant, project_id)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    project_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[DocumentService, Depends(get_service)],
) -> Response:
    await service.delete_document(tenant, project_id, document_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
