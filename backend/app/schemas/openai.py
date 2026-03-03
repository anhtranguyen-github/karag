from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field


class OpenAIMessage(BaseModel):
    """OpenAI-compatible message schema."""
    role: str = Field(..., description="The role of the message author")
    content: str = Field(..., description="The content of the message")
    name: Optional[str] = Field(None, description="The name of the author")


class ChatCompletionRequest(BaseModel):
    """OpenAI-compatible chat completion request schema."""
    model: str = Field(..., description="ID of the model to use")
    messages: List[OpenAIMessage] = Field(..., description="List of messages")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="Sampling temperature")
    top_p: Optional[float] = Field(1.0, ge=0, le=1, description="Nucleus sampling probability")
    n: Optional[int] = Field(1, ge=1, le=128, description="Number of completions to generate")
    stream: Optional[bool] = Field(False, description="Whether to stream back partial progress")
    stop: Optional[Union[str, List[str]]] = Field(None, description="Stop sequences")
    max_tokens: Optional[int] = Field(None, ge=1, description="Maximum number of tokens to generate")
    presence_penalty: Optional[float] = Field(0.0, ge=-2, le=2, description="Presence penalty")
    frequency_penalty: Optional[float] = Field(0.0, ge=-2, le=2, description="Frequency penalty")
    logit_bias: Optional[Dict[str, int]] = Field(None, description="Logit bias per token")
    user: Optional[str] = Field(None, description="Unique identifier for end-user")


class ChatCompletionResponseChoice(BaseModel):
    """OpenAI-compatible choice schema for chat completion response."""
    index: int = Field(..., description="Index of the choice")
    message: OpenAIMessage = Field(..., description="The generated message")
    finish_reason: Optional[str] = Field("stop", description="Reason for completion finish")


class ChatCompletionStreamChoice(BaseModel):
    """OpenAI-compatible choice schema for streaming chat completion."""
    index: int = Field(..., description="Index of the choice")
    delta: Dict[str, Any] = Field(..., description="Delta content for streaming")
    finish_reason: Optional[str] = Field(None, description="Reason for completion finish")


class ChatCompletionUsage(BaseModel):
    """OpenAI-compatible usage schema."""
    prompt_tokens: int = Field(..., description="Number of tokens in the prompt")
    completion_tokens: int = Field(..., description="Number of tokens in the completion")
    total_tokens: int = Field(..., description="Total number of tokens used")


class ChatCompletionResponse(BaseModel):
    """OpenAI-compatible chat completion response schema."""
    id: str = Field(..., description="Unique identifier for the completion")
    object: str = Field("chat.completion", description="Object type")
    created: int = Field(..., description="Unix timestamp of creation")
    model: str = Field(..., description="Model used for completion")
    choices: List[ChatCompletionResponseChoice] = Field(..., description="List of completion choices")
    usage: ChatCompletionUsage = Field(..., description="Token usage statistics")


class ChatCompletionStreamResponse(BaseModel):
    """OpenAI-compatible streaming chat completion response schema."""
    id: str = Field(..., description="Unique identifier for the completion")
    object: str = Field("chat.completion.chunk", description="Object type")
    created: int = Field(..., description="Unix timestamp of creation")
    model: str = Field(..., description="Model used for completion")
    choices: List[ChatCompletionStreamChoice] = Field(..., description="List of completion choices")


class OpenAIError(BaseModel):
    """OpenAI-compatible error schema."""
    message: str = Field(..., description="Error message")
    type: str = Field(..., description="Error type")
    param: Optional[str] = Field(None, description="Parameter that caused the error")
    code: Optional[str] = Field(None, description="Error code")


class OpenAIErrorResponse(BaseModel):
    """OpenAI-compatible error response wrapper."""
    error: OpenAIError = Field(..., description="Error details")
