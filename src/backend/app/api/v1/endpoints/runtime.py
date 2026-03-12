"""Runtime inference endpoints mounted at /v1 (OpenAI-compatible pattern).

These are the endpoints the frontend calls for actual RAG/LLM inference:
  POST /v1/rag/query
  GET  /v1/models
  GET  /v1/documents
  POST /v1/chat/completions
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext, get_tenant_context

router = APIRouter(prefix="/v1", tags=["runtime"])
logger = logging.getLogger(__name__)


# ── Schemas ──


class RagQueryRequest(BaseModel):
    workspace_id: str | None = None
    knowledge_dataset_id: str | None = None
    query: str
    top_k: int | None = None
    llm_provider: str | None = None
    llm_model: str | None = None


class RagChunkResult(BaseModel):
    chunk_id: str = ""
    document_id: str = ""
    document_title: str = ""
    score: float = 0.0
    text: str = ""


class RagQueryResponse(BaseModel):
    answer: str
    provider: str = ""
    model: str = ""
    prompt: str = ""
    chunks: list[RagChunkResult] = Field(default_factory=list)
    usage: dict[str, int] = Field(default_factory=lambda: {
        "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0
    })
    trace: list[str] = Field(default_factory=list)


class ChatCompletionRequest(BaseModel):
    provider: str
    model: str
    workspace_id: str | None = None
    messages: list[dict[str, str]]


class ChatCompletionResponse(BaseModel):
    provider: str
    model: str
    content: str
    usage: dict[str, int] = Field(default_factory=dict)


class RuntimeModelSummary(BaseModel):
    provider: str
    kind: str  # llm, embedding, reranking
    models: list[str] = Field(default_factory=list)


# ── Routes ──


@router.post("/rag/query", response_model=RagQueryResponse)
async def rag_query(
    payload: RagQueryRequest,
    request: Request,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
) -> RagQueryResponse:
    karag_manager = request.app.state.karag_manager
    workspace_id = payload.workspace_id or tenant.workspace_id
    dataset_id = payload.knowledge_dataset_id or "default"

    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="workspace_id is required either in the request body or tenant headers."
        )

    try:
        result = await karag_manager.execute_rag_query(
            tenant=tenant,
            workspace_id=workspace_id,
            query=payload.query,
            dataset_id=dataset_id,
        )
    except Exception as exc:
        logger.error("RAG query failed for workspace %s: %s", workspace_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG query failed because an upstream inference provider is unavailable."
        ) from exc

    chunks = [
        RagChunkResult(
            chunk_id=c.chunk_id,
            document_id=c.document_id,
            document_title=c.document_title,
            score=c.score,
            text=c.text,
        )
        for c in result.chunks
    ]

    setting = karag_manager._resolve_workspace_setting(tenant, workspace_id)

    return RagQueryResponse(
        answer=result.answer,
        provider=setting.llm.provider,
        model=setting.llm.model,
        prompt=result.prompt,
        chunks=chunks,
        trace=getattr(result, "trace", None) or [],
    )


@router.get("/models", response_model=list[RuntimeModelSummary])
def list_runtime_models(request: Request) -> list[RuntimeModelSummary]:
    karag_manager: KaragManager = request.app.state.karag_manager
    components = karag_manager.list_available_components()

    result: list[RuntimeModelSummary] = []

    for name in components.get("inference", []):
        result.append(RuntimeModelSummary(provider=name, kind="llm", models=[name]))

    for name in components.get("embedder", []):
        result.append(RuntimeModelSummary(provider=name, kind="embedding", models=[name]))

    for name in components.get("reranker", []):
        result.append(RuntimeModelSummary(provider=name, kind="reranking", models=[name]))

    return result


@router.get("/documents")
def list_runtime_documents(
    workspace_id: str,
    request: Request,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
) -> list[dict[str, Any]]:
    karag_manager: KaragManager = request.app.state.karag_manager
    docs = karag_manager.document_service.list_documents(tenant, tenant.project_id)
    return [d.model_dump() if hasattr(d, "model_dump") else d.__dict__ for d in docs]


@router.post("/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(
    payload: ChatCompletionRequest,
    request: Request,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
) -> ChatCompletionResponse:
    karag_manager: KaragManager = request.app.state.karag_manager

    workspace_id = payload.workspace_id or tenant.workspace_id
    setting = karag_manager._resolve_workspace_setting(tenant, workspace_id)

    rag_config = {"llm": setting.llm.model_dump() if hasattr(setting.llm, "model_dump") else {}}
    # Override provider/model if specified
    rag_config["llm"]["provider"] = payload.provider
    rag_config["llm"]["model"] = payload.model

    from app.rag.schemas.types import ChatMessage

    messages = [ChatMessage(role=m["role"], content=m["content"]) for m in payload.messages]
    answer = await karag_manager.rag_manager.inference.process(rag_config, messages)

    return ChatCompletionResponse(
        provider=payload.provider,
        model=payload.model,
        content=answer,
    )
