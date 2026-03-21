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

        # 2. Verify workspace ownership
        workspace = self.karag_manager.workspaces.get(tenant, payload.workspace_id)
        if not workspace or workspace.project_id != payload.project_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Workspace not found in this project scope."
            )

        return self.karag_manager.chat_repository.create_session(tenant.actor_id, payload)

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

        # 1. Store User Message
        user_msg = self.karag_manager.chat_repository.add_message(
            session_id, 
            ChatMessageCreate(role="user", content=query)
        )

        # 2. Execute RAG Query (Delegating to RagManager)
        # Note: RagManager needs to be updated in Phase 3 to handle scoped execution properly.
        # For now, we use a placeholder or the existing execute method.
        try:
            # result = self.karag_manager.execute_rag_query(...)
            assistant_answer = f"Echo from Overhaul: {query}" # Placeholder
        except Exception as e:
            logger.error(f"RAG execution failed: {e}")
            assistant_answer = "I'm sorry, I encountered an error while processing your request."

        # 3. Store Assistant Message
        assistant_msg = self.karag_manager.chat_repository.add_message(
            session_id,
            ChatMessageCreate(role="assistant", content=assistant_answer)
        )

        return assistant_msg

    def list_sessions(self, tenant: TenantContext, workspace_id: str) -> list[ChatSessionSummary]:
        # Minimal permission check for listing
        if "workspace.view" not in tenant.permissions:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
             
        return self.karag_manager.chat_repository.list_sessions_for_workspace(workspace_id)

    def list_messages(self, tenant: TenantContext, session_id: str) -> list[ChatMessageSummary]:
        # TODO: Verify user owns session or has org/project access
        return self.karag_manager.chat_repository.list_messages_for_session(session_id)
