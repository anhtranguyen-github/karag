from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.core.container import PlatformContainer
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.runtime.schemas import ChatCompletionRequest, ChatCompletionResponse
from app.modules.runtime.schemas import EmbeddingRequest, EmbeddingResponse, RagQueryRequest
from app.modules.runtime.schemas import RagQueryResponse, RuntimeDocumentSummary, RuntimeModelSummary
from app.modules.runtime.services import RuntimeService


router = APIRouter(prefix="/v1", tags=["runtime"])


def get_service(request: Request) -> RuntimeService:
    container: PlatformContainer = request.app.state.container
    return RuntimeService(container)


@router.get("/models", response_model=list[RuntimeModelSummary])
def list_models(
    service: Annotated[RuntimeService, Depends(get_service)],
) -> list[RuntimeModelSummary]:
    return service.list_models()


@router.post("/embeddings", response_model=EmbeddingResponse)
def embeddings(
    payload: EmbeddingRequest,
    service: Annotated[RuntimeService, Depends(get_service)],
) -> EmbeddingResponse:
    return service.embeddings(payload)


@router.post("/chat/completions", response_model=ChatCompletionResponse)
def chat_completions(
    payload: ChatCompletionRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[RuntimeService, Depends(get_service)],
) -> ChatCompletionResponse:
    return service.chat(tenant, payload)


@router.post("/rag/query", response_model=RagQueryResponse)
def rag_query(
    payload: RagQueryRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[RuntimeService, Depends(get_service)],
) -> RagQueryResponse:
    return service.rag_query(tenant, payload)


@router.post("/retrieval/debug", response_model=RagQueryResponse)
def retrieval_debug(
    payload: RagQueryRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[RuntimeService, Depends(get_service)],
) -> RagQueryResponse:
    return service.rag_query(tenant, payload)


@router.get("/documents", response_model=list[RuntimeDocumentSummary])
def list_documents(
    workspace_id: Annotated[str, Query()],
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[RuntimeService, Depends(get_service)],
) -> list[RuntimeDocumentSummary]:
    return service.list_documents(tenant, workspace_id)


@router.post("/rag/ingest", response_model=dict[str, str])
def rag_ingest_hint() -> dict[str, str]:
    return {
        "status": "accepted",
        "message": "Use /api/v1/knowledge-datasets/{id}/documents for document ingestion in this build.",
    }
