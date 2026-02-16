from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ChatMessage(BaseModel):
    role: str = Field(..., description="The role of the message sender (user or assistant)")
    content: str = Field(..., description="The content of the message")
    id: Optional[str] = Field(None, description="Unique identifier for the message")
    reasoning_steps: Optional[List[str]] = Field(None, description="Thinking process steps")
    sources: Optional[List[Dict[str, Any]]] = Field(None, description="Source documents used for the response")

class ChatThread(BaseModel):
    id: str
    title: str
    has_thinking: bool = False
    tags: List[str] = []

class ThreadTitleUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)

class ChatStreamRequest(BaseModel):
    message: str = Field(..., description="The user message to process")
    thread_id: str = Field(..., description="The ID of the chat thread")
    workspace_id: str = Field("default", description="The workspace ID context")
