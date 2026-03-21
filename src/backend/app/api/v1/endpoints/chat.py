from __future__ import annotations
from typing import Annotated
from fastapi import APIRouter, Depends, Request, status
from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.chat.schemas import (
    ChatSessionSummary, 
    ChatSessionCreate, 
    ChatMessageSummary
)
from app.modules.chat.services import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])

def get_service(request: Request) -> ChatService:
    karag_manager: KaragManager = request.app.state.karag_manager
    return karag_manager.chat_service

@router.post("/sessions", response_model=ChatSessionSummary, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: ChatSessionCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ChatService, Depends(get_service)],
) -> ChatSessionSummary:
    """Create a new workspace-scoped chat session."""
    return service.create_session(tenant, payload)

@router.get("/sessions", response_model=list[ChatSessionSummary])
async def list_sessions(
    workspace_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ChatService, Depends(get_service)],
) -> list[ChatSessionSummary]:
    """List sessions for a specific workspace."""
    return service.list_sessions(tenant, workspace_id)

@router.post("/sessions/{session_id}/ask", response_model=ChatMessageSummary)
async def ask_question(
    session_id: str,
    query: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ChatService, Depends(get_service)],
) -> ChatMessageSummary:
    """Send a message to a session and trigger RAG generation."""
    return await service.ask(tenant, session_id, query)

@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageSummary])
async def list_messages(
    session_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    service: Annotated[ChatService, Depends(get_service)],
) -> list[ChatMessageSummary]:
    """Get message history for a session."""
    return service.list_messages(tenant, session_id)
