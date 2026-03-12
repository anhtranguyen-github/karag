from __future__ import annotations
import logging
from typing import Any
from fastapi import HTTPException, status
from app.core.tenancy import TenantContext
from app.modules.chat.schemas import (
    ChatSessionSummary,
    ChatSessionCreate,
    ChatMessageCreate,
    ChatMessageSummary,
)

logger = logging.getLogger(__name__)


def _categorize_chat_error(exc: Exception) -> tuple[str, str]:
    detail = str(exc)
    lowered = detail.lower()

    if "401" in detail or "unauthorized" in lowered:
        return ("provider_auth_failed", "The configured model provider rejected the request.")
    if "connection refused" in lowered or "timed out" in lowered or "temporarily unavailable" in lowered:
        return ("provider_unavailable", "The configured model provider is currently unavailable.")
    if "api key" in lowered:
        return ("provider_misconfigured", "The configured model provider is missing credentials.")

    return ("chat_execution_failed", "The assistant could not complete this request.")

class ChatService:
    """
    Manages workspace-scoped chat sessions and message orchestration.
    Coordinates with RagManager for retrieval-augmented generation.
    """
    def __init__(self, karag_manager: Any) -> None:
        self.karag_manager = karag_manager

    def create_session(
        self, 
        tenant: TenantContext, 
        payload: ChatSessionCreate
    ) -> ChatSessionSummary:
        # 1. Explicit permission check
        if "chat.session" not in tenant.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="User lacks chat.session permission."
            )

        workspace_id = payload.workspace_id or tenant.workspace_id
        project_id = payload.project_id or tenant.project_id
        organization_id = payload.organization_id or tenant.organization_id

        if not workspace_id or not project_id or not organization_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Workspace, project, and organization scope are required."
            )

        if payload.workspace_id and payload.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="workspace_id does not match the tenant scope."
            )

        if payload.project_id and payload.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="project_id does not match the tenant scope."
            )

        if payload.organization_id and payload.organization_id != organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="organization_id does not match the tenant scope."
            )

        normalized_payload = ChatSessionCreate(
            title=payload.title,
            workspace_id=workspace_id,
            project_id=project_id,
            organization_id=organization_id,
        )

        # 2. Verify workspace ownership
        workspace = self.karag_manager.workspaces.get(tenant, workspace_id)
        if not workspace or workspace.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Workspace not found in this project scope."
            )

        return self.karag_manager.chat_repository.create_session(tenant.actor_id, normalized_payload)

    def _get_authorized_session(self, tenant: TenantContext, session_id: str) -> ChatSessionSummary:
        session = self.karag_manager.chat_repository.get_session(session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found.")
        if session.organization_id != tenant.organization_id or session.project_id != tenant.project_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        if tenant.workspace_id and session.workspace_id != tenant.workspace_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        if session.user_id != tenant.actor_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return session

    async def ask(
        self, 
        tenant: TenantContext, 
        session_id: str, 
        query: str
    ) -> ChatMessageSummary:
        """
        Orchestrates the RAG flow: 
        User Message -> RagManager -> Assistant Message.
        """
        if "chat.ask" not in tenant.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="User lacks chat.ask permission."
            )

        session = self._get_authorized_session(tenant, session_id)

        # 1. Store User Message
        user_msg = self.karag_manager.chat_repository.add_message(
            session_id, 
            ChatMessageCreate(role="user", content=query)
        )

        # 2. Execute RAG Query (Delegating to KaragManager)
        try:
            from app.rag.schemas.types import ChatMessage
            
            # Fetch context history to guide the generation (last 10 messages)
            # This turns the 'Ask' endpoint into a true conversational RAG pipeline
            history = self.list_messages(tenant, session_id)
            conversation_context = [
                ChatMessage(role=msg.role, content=msg.content)
                for msg in history[-10:]
            ]

            result = await self.karag_manager.execute_rag_query(
                tenant=tenant,
                workspace_id=session.workspace_id,
                query=query,
                dataset_id="default",
                conversation_history=conversation_context
            )
            assistant_answer = result.answer
            # Extract chunks/sources for the frontend to display
            sources = [
                {
                    "chunk_id": c.chunk_id,
                    "document_id": c.document_id,
                    "document_title": c.document_title,
                    "score": c.score,
                    "text": c.text[:200] + "..." if len(c.text) > 200 else c.text
                }
                for c in result.chunks
            ]
            trace = getattr(result, "trace", None) or []
            error_metadata = {}
        except Exception as e:
            logger.error(f"RAG execution failed for session {session_id}: {e}", exc_info=True)
            error_code, error_message = _categorize_chat_error(e)
            assistant_answer = error_message
            sources = []
            trace = []
            error_metadata = {
                "error": {
                    "code": error_code,
                    "message": error_message,
                    "detail": str(e),
                }
            }

        # 3. Store Assistant Message
        assistant_msg = self.karag_manager.chat_repository.add_message(
            session_id,
            ChatMessageCreate(
                role="assistant", 
                content=assistant_answer,
                metadata={"sources": sources, "trace": trace, **error_metadata}
            )
        )

        return assistant_msg

    def list_sessions(self, tenant: TenantContext, workspace_id: str | None = None) -> list[ChatSessionSummary]:
        if "workspace.view" not in tenant.permissions or (
            "chat.session" not in tenant.permissions and "chat.ask" not in tenant.permissions
        ):
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        resolved_workspace_id = workspace_id or tenant.workspace_id
        if not resolved_workspace_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="workspace_id is required."
            )

        return [
            session
            for session in self.karag_manager.chat_repository.list_sessions_for_workspace(resolved_workspace_id)
            if session.organization_id == tenant.organization_id
            and session.project_id == tenant.project_id
            and session.user_id == tenant.actor_id
        ]

    def list_messages(self, tenant: TenantContext, session_id: str) -> list[ChatMessageSummary]:
        if "chat.ask" not in tenant.permissions and "chat.session" not in tenant.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        self._get_authorized_session(tenant, session_id)
        return self.karag_manager.chat_repository.list_messages_for_session(session_id)
