from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field


class OpenAIMessage(BaseModel):
    """OpenAI-compatible message schema."""

    role: str = Field(
        ...,
        description="The role of the message author (system, user, assistant, tool)",
    )
    content: Optional[str] = Field(None, description="The content of the message")
    name: Optional[str] = Field(None, description="The name of the author")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(
        None, description="Tool calls made by the assistant"
    )
    tool_call_id: Optional[str] = Field(
        None, description="Tool call ID for tool messages"
    )


class ChatCompletionRequest(BaseModel):
    """OpenAI-compatible chat completion request schema.

    Model format: karag:<workspace_name> or karag:<workspace_name>:<mode>
    - mode can be: chat, qa, tutor, strict_rag
    """

    model: str = Field(
        ..., description="ID of the model to use (format: karag:<workspace>[:mode])"
    )
    messages: List[OpenAIMessage] = Field(..., description="List of messages")
    temperature: Optional[float] = Field(
        0.7, ge=0, le=2, description="Sampling temperature"
    )
    top_p: Optional[float] = Field(
        1.0, ge=0, le=1, description="Nucleus sampling probability"
    )
    n: Optional[int] = Field(
        1, ge=1, le=128, description="Number of completions to generate"
    )
    stream: Optional[bool] = Field(
        False, description="Whether to stream back partial progress"
    )
    stop: Optional[Union[str, List[str]]] = Field(None, description="Stop sequences")
    max_tokens: Optional[int] = Field(
        None, ge=1, description="Maximum number of tokens to generate"
    )
    max_completion_tokens: Optional[int] = Field(
        None, ge=1, description="Maximum completion tokens (OpenAI compatible alias)"
    )
    presence_penalty: Optional[float] = Field(
        0.0, ge=-2, le=2, description="Presence penalty"
    )
    frequency_penalty: Optional[float] = Field(
        0.0, ge=-2, le=2, description="Frequency penalty"
    )
    logit_bias: Optional[Dict[str, int]] = Field(
        None, description="Logit bias per token"
    )
    user: Optional[str] = Field(None, description="Unique identifier for end-user")
    seed: Optional[int] = Field(None, description="Seed for deterministic sampling")
    response_format: Optional[Dict[str, Any]] = Field(
        None, description="Response format specification"
    )


class ChatCompletionResponseChoice(BaseModel):
    """OpenAI-compatible choice schema for chat completion response."""

    index: int = Field(..., description="Index of the choice")
    message: OpenAIMessage = Field(..., description="The generated message")
    finish_reason: Optional[str] = Field(
        "stop",
        description="Reason for completion finish (stop, length, content_filter, tool_calls)",
    )
    logprobs: Optional[Dict[str, Any]] = Field(
        None, description="Log probabilities for tokens"
    )


class ChatCompletionStreamChoice(BaseModel):
    """OpenAI-compatible choice schema for streaming chat completion."""

    index: int = Field(..., description="Index of the choice")
    delta: Dict[str, Any] = Field(..., description="Delta content for streaming")
    finish_reason: Optional[str] = Field(
        None, description="Reason for completion finish"
    )
    logprobs: Optional[Dict[str, Any]] = Field(
        None, description="Log probabilities for tokens"
    )


class ChatCompletionUsage(BaseModel):
    """OpenAI-compatible usage schema."""

    prompt_tokens: int = Field(..., description="Number of tokens in the prompt")
    completion_tokens: int = Field(
        ..., description="Number of tokens in the completion"
    )
    total_tokens: int = Field(..., description="Total number of tokens used")
    prompt_tokens_details: Optional[Dict[str, Any]] = Field(
        None, description="Details about prompt tokens"
    )
    completion_tokens_details: Optional[Dict[str, Any]] = Field(
        None, description="Details about completion tokens"
    )


class ChatCompletionResponse(BaseModel):
    """OpenAI-compatible chat completion response schema."""

    id: str = Field(..., description="Unique identifier for the completion")
    object: str = Field("chat.completion", description="Object type")
    created: int = Field(..., description="Unix timestamp of creation")
    model: str = Field(..., description="Model used for completion")
    choices: List[ChatCompletionResponseChoice] = Field(
        ..., description="List of completion choices"
    )
    usage: ChatCompletionUsage = Field(..., description="Token usage statistics")
    system_fingerprint: Optional[str] = Field(None, description="System fingerprint")


class ChatCompletionStreamResponse(BaseModel):
    """OpenAI-compatible streaming chat completion response schema."""

    id: str = Field(..., description="Unique identifier for the completion")
    object: str = Field("chat.completion.chunk", description="Object type")
    created: int = Field(..., description="Unix timestamp of creation")
    model: str = Field(..., description="Model used for completion")
    choices: List[ChatCompletionStreamChoice] = Field(
        ..., description="List of completion choices"
    )
    system_fingerprint: Optional[str] = Field(None, description="System fingerprint")


class OpenAIError(BaseModel):
    """OpenAI-compatible error schema."""

    message: str = Field(..., description="Error message")
    type: str = Field(..., description="Error type")
    param: Optional[str] = Field(None, description="Parameter that caused the error")
    code: Optional[str] = Field(None, description="Error code")


class OpenAIErrorResponse(BaseModel):
    """OpenAI-compatible error response wrapper."""

    error: OpenAIError = Field(..., description="Error details")


# Models API (for /v1/models endpoint)


class ModelInfo(BaseModel):
    """OpenAI-compatible model info."""

    id: str = Field(..., description="Model ID")
    object: str = Field("model", description="Object type")
    created: int = Field(..., description="Unix timestamp of creation")
    owned_by: str = Field(..., description="Organization that owns the model")
    permission: List[Dict[str, Any]] = Field(
        default_factory=list, description="Model permissions"
    )
    root: Optional[str] = Field(None, description="Root model")
    parent: Optional[str] = Field(None, description="Parent model")


class ModelsResponse(BaseModel):
    """OpenAI-compatible models list response."""

    object: str = Field("list", description="Object type")
    data: List[ModelInfo] = Field(..., description="List of models")
