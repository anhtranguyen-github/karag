from __future__ import annotations
from typing import Annotated
from fastapi import APIRouter, Depends, File, Request, UploadFile, status, Header
from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.documents.schemas import DocumentSummary
from app.modules.documents.services import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])

def get_service(request: Request) -> DocumentService:
    karag_manager: KaragManager = request.app.state.karag_manager
    return karag_manager.document_service

@router.post(
    "/upload",
    response_model=DocumentSummary,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    project_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[DocumentService, Depends(get_service)],
    file: UploadFile = File(...),
) -> DocumentSummary:
    """
    Upload a document to a specific project. 
    Strictly scoped by organization via tenant context.
    """
    return await service.upload_document(tenant, project_id, file)

@router.get("", response_model=list[DocumentSummary])
async def list_documents(
    project_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[DocumentService, Depends(get_service)],
) -> list[DocumentSummary]:
    return service.list_documents(tenant, project_id)
