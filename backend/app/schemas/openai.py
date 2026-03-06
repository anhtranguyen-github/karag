from typing import Any

from pydantic import BaseModel, Field


class OpenAIMessage(BaseModel):
    """OpenAI-compatible message schema."""

    role: str = Field(
        ...,
        description="The role of the message author (system, user, assistant, tool)",
    )
    content: str | None = Field(None, description="The content of the message")
    name: str | None = Field(None, description="The name of the author")
    tool_calls: list[dict[str, Any]] | None = Field(
        None, description="Tool calls made by the assistant"
    )
    tool_call_id: str | None = Field(None, description="Tool call ID for tool messages")


class ChatCompletionRequest(BaseModel):
    """OpenAI-compatible chat completion request schema.

    Model format: karag:<workspace_name> or karag:<workspace_name>:<mode>
    - mode can be: chat, qa, tutor, strict_rag
    """

    model: str = Field(..., description="ID of the model to use (format: karag:<workspace>[:mode])")
    messages: list[OpenAIMessage] = Field(..., description="List of messages")
    temperature: float | None = Field(0.7, ge=0, le=2, description="Sampling temperature")
    top_p: float | None = Field(1.0, ge=0, le=1, description="Nucleus sampling probability")
    n: int | None = Field(1, ge=1, le=128, description="Number of completions to generate")
    stream: bool | None = Field(False, description="Whether to stream back partial progress")
    stop: str | list[str] | None = Field(None, description="Stop sequences")
    max_tokens: int | None = Field(None, ge=1, description="Maximum number of tokens to generate")
    max_completion_tokens: int | None = Field(
        None, ge=1, description="Maximum completion tokens (OpenAI compatible alias)"
    )
    presence_penalty: float | None = Field(0.0, ge=-2, le=2, description="Presence penalty")
    frequency_penalty: float | None = Field(0.0, ge=-2, le=2, description="Frequency penalty")
    logit_bias: dict[str, int] | None = Field(None, description="Logit bias per token")
    user: str | None = Field(None, description="Unique identifier for end-user")
    seed: int | None = Field(None, description="Seed for deterministic sampling")
    response_format: dict[str, Any] | None = Field(
        None, description="Response format specification"
    )


class ChatCompletionResponseChoice(BaseModel):
    """OpenAI-compatible choice schema for chat completion response."""

    index: int = Field(..., description="Index of the choice")
    message: OpenAIMessage = Field(..., description="The generated message")
    finish_reason: str | None = Field(
        "stop",
        description="Reason for completion finish (stop, length, content_filter, tool_calls)",
    )
    logprobs: dict[str, Any] | None = Field(None, description="Log probabilities for tokens")


class ChatCompletionStreamChoice(BaseModel):
    """OpenAI-compatible choice schema for streaming chat completion."""

    index: int = Field(..., description="Index of the choice")
    delta: dict[str, Any] = Field(..., description="Delta content for streaming")
    finish_reason: str | None = Field(None, description="Reason for completion finish")
    logprobs: dict[str, Any] | None = Field(None, description="Log probabilities for tokens")


class ChatCompletionUsage(BaseModel):
    """OpenAI-compatible usage schema."""

    prompt_tokens: int = Field(..., description="Number of tokens in the prompt")
    completion_tokens: int = Field(..., description="Number of tokens in the completion")
    total_tokens: int = Field(..., description="Total number of tokens used")
    prompt_tokens_details: dict[str, Any] | None = Field(
        None, description="Details about prompt tokens"
    )
    completion_tokens_details: dict[str, Any] | None = Field(
        None, description="Details about completion tokens"
    )


class ChatCompletionResponse(BaseModel):
    """OpenAI-compatible chat completion response schema."""

    id: str = Field(..., description="Unique identifier for the completion")
    object: str = Field("chat.completion", description="Object type")
    created: int = Field(..., description="Unix timestamp of creation")
    model: str = Field(..., description="Model used for completion")
    choices: list[ChatCompletionResponseChoice] = Field(
        ..., description="List of completion choices"
    )
    usage: ChatCompletionUsage = Field(..., description="Token usage statistics")
    system_fingerprint: str | None = Field(None, description="System fingerprint")


class ChatCompletionStreamResponse(BaseModel):
    """OpenAI-compatible streaming chat completion response schema."""

    id: str = Field(..., description="Unique identifier for the completion")
    object: str = Field("chat.completion.chunk", description="Object type")
    created: int = Field(..., description="Unix timestamp of creation")
    model: str = Field(..., description="Model used for completion")
    choices: list[ChatCompletionStreamChoice] = Field(..., description="List of completion choices")
    system_fingerprint: str | None = Field(None, description="System fingerprint")


class OpenAIError(BaseModel):
    """OpenAI-compatible error schema."""

    message: str = Field(..., description="Error message")
    type: str = Field(..., description="Error type")
    param: str | None = Field(None, description="Parameter that caused the error")
    code: str | None = Field(None, description="Error code")


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
    permission: list[dict[str, Any]] = Field(default_factory=list, description="Model permissions")
    root: str | None = Field(None, description="Root model")
    parent: str | None = Field(None, description="Parent model")


class ModelsResponse(BaseModel):
    """OpenAI-compatible models list response."""

    object: str = Field("list", description="Object type")
    data: list[ModelInfo] = Field(..., description="List of models")
