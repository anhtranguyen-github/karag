from __future__ import annotations
import uuid
from datetime import datetime, UTC
from sqlalchemy import select
from app.core.database import DatabaseManager, ChatSessionRow, ChatMessageRow
from app.modules.chat.schemas import ChatSessionCreate, ChatSessionSummary, ChatMessageCreate, ChatMessageSummary

class ChatRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create_session(self, user_id: str, session: ChatSessionCreate) -> ChatSessionSummary:
        session_id = str(uuid.uuid4())
        with self.database.session() as db_session:
            row = ChatSessionRow(
                id=session_id,
                organization_id=session.organization_id,
                project_id=session.project_id,
                workspace_id=session.workspace_id,
                user_id=user_id,
                title=session.title,
                created_at=datetime.now(UTC)
            )
            db_session.add(row)
        
        return ChatSessionSummary(
            id=session_id,
            organization_id=session.organization_id,
            project_id=session.project_id,
            workspace_id=session.workspace_id,
            user_id=user_id,
            title=session.title,
            created_at=row.created_at
        )

    def list_sessions_for_workspace(self, workspace_id: str) -> list[ChatSessionSummary]:
        with self.database.session() as db_session:
            rows = db_session.scalars(
                select(ChatSessionRow).where(ChatSessionRow.workspace_id == workspace_id)
            ).all()
            return [
                ChatSessionSummary(
                    id=row.id,
                    workspace_id=row.workspace_id,
                    project_id=row.project_id,
                    organization_id=row.organization_id,
                    user_id=row.user_id,
                    title=row.title,
                    created_at=row.created_at
                ) for row in rows
            ]

    def add_message(self, session_id: str, message: ChatMessageCreate) -> ChatMessageSummary:
        message_id = str(uuid.uuid4())
        with self.database.session() as db_session:
            row = ChatMessageRow(
                id=message_id,
                session_id=session_id,
                role=message.role,
                content=message.content,
                metadata_json=message.metadata,
                created_at=datetime.now(UTC)
            )
            db_session.add(row)
        
        return ChatMessageSummary(
            id=message_id,
            session_id=session_id,
            role=message.role,
            content=message.content,
            metadata=message.metadata,
            created_at=row.created_at
        )

    def list_messages_for_session(self, session_id: str) -> list[ChatMessageSummary]:
        with self.database.session() as db_session:
            rows = db_session.scalars(
                select(ChatMessageRow).where(ChatMessageRow.session_id == session_id).order_by(ChatMessageRow.created_at)
            ).all()
            return [
                ChatMessageSummary(
                    id=row.id,
                    session_id=row.session_id,
                    role=row.role,
                    content=row.content,
                    metadata=row.metadata_json,
                    created_at=row.created_at
                ) for row in rows
            ]
