from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Any

class ChatMessageBase(BaseModel):
    role: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageSummary(ChatMessageBase):
    id: str
    session_id: str
    created_at: datetime

class ChatSessionBase(BaseModel):
    title: Optional[str] = None

class ChatSessionCreate(ChatSessionBase):
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    organization_id: Optional[str] = None

class ChatAskRequest(BaseModel):
    message: str

class ChatSessionSummary(ChatSessionBase):
    id: str
    workspace_id: str
    project_id: str
    organization_id: str
    user_id: str
    created_at: datetime
