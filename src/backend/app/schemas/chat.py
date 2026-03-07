from typing import Any

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="The role of the message sender (user or assistant)")
    content: str = Field(..., description="The content of the message")
    id: str | None = Field(None, description="Unique identifier for the message")
    reasoning_steps: list[str] | None = Field(None, description="Thinking process steps")
    sources: list[dict[str, Any]] | None = Field(None, description="Source documents used for the response")


class ChatThread(BaseModel):
    id: str
    title: str
    has_thinking: bool = False
    tags: list[str] = []
    updated_at: str | None = None


class ThreadMetadata(BaseModel):
    id: str | None = None
    thread_id: str
    workspace_id: str
    title: str | None = "New chat"
    has_thinking: bool = False
    tags: list[str] = []
    updated_at: str | None = None
    created_at: str | None = None


class ThreadTitleUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)


class ChatStreamRequest(BaseModel):
    message: str = Field(..., description="The user message to process")
    thread_id: str = Field(..., description="The ID of the chat thread")
    workspace_id: str = Field(..., description="The workspace ID context")
    execution: dict[str, Any] | None = Field(None, description="Runtime execution settings")
