import json
import time
import uuid
from typing import AsyncGenerator

import structlog
from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse

from backend.app.core.mongodb import mongodb_manager
from backend.app.providers.base import LLMMessage
from backend.app.providers.llm import get_llm
from backend.app.rag.rag_service import rag_service
from backend.app.schemas.openai import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionResponseChoice,
    ChatCompletionUsage,
    OpenAIMessage,
    OpenAIError,
    OpenAIErrorResponse,
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/v1", tags=["openai"])


def create_openai_error_response(
    message: str, error_type: str, status_code: int = 400, code: str = None
) -> Response:
    """Create a standardized OpenAI-style error response."""
    error = OpenAIError(message=message, type=error_type, code=code)
    return Response(
        content=OpenAIErrorResponse(error=error).model_dump_json(),
        status_code=status_code,
        media_type="application/json",
    )


@router.post("/chat/completions")
async def chat_completions(payload: ChatCompletionRequest):
    """
    OpenAI-compatible Chat Completions API with RAG integration.
    """
    model_name = payload.model
    logger.info("openai_chat_completion_request", model=model_name)

    # 1. Resolve workspace from model format karag:<workspace_name>
    model_parts = model_name.split(":", 1)
    if len(model_parts) < 2 or not model_parts[1]:
        return create_openai_error_response(
            "Invalid model format. Must be 'karag:<workspace_name>'",
            "invalid_request_error",
            400,
        )

    workspace_name = model_parts[1]
    db = mongodb_manager.get_async_database()
    workspace = await db.workspaces.find_one({"name": workspace_name})

    if not workspace:
        return create_openai_error_response(
            f"Workspace '{workspace_name}' does not exist.",
            "invalid_request_error",
            404,
        )

    workspace_id = workspace["id"]

    # 2. Extract query for retrieval (last user message)
    query = ""
    for msg in reversed(payload.messages):
        if msg.role == "user":
            query = msg.content
            break

    # 3. Retrieve relevant documents
    retrieved_context = ""
    if query:
        try:
            # Fallback to LLM without documents if retrieval fails is handled by try-except
            search_results = await rag_service.search(query, workspace_id)
            if search_results:
                # Requirement 7: Truncate if token limits are exceeded.
                # Since we don't have a tokenizer here, we limit to top results and 
                # a reasonable character limit as a heuristic.
                context_parts = []
                current_chars = 0
                MAX_CONTEXT_CHARS = 10000  # Conservative limit (~2.5k-3k tokens)
                
                for res in search_results:
                    text = res.get("text", "")
                    if text:
                        if current_chars + len(text) > MAX_CONTEXT_CHARS:
                            remaining = MAX_CONTEXT_CHARS - current_chars
                            if remaining > 100:
                                context_parts.append(text[:remaining] + "...")
                            break
                        context_parts.append(text)
                        current_chars += len(text)
                
                if context_parts:
                    retrieved_context = "\n\n".join(context_parts)
                    
        except Exception as e:
            logger.error(
                "retrieval_failed_fallback_to_llm",
                error=str(e),
                workspace_id=workspace_id,
            )
            # Fallback to LLM without documents - retrieved_context remains empty

    # 4. Construct internal messages
    internal_messages = []
    
    # Inject retrieved content as system context (Requirement 4)
    if retrieved_context:
        system_msg = f"Knowledge Base Context:\n---\n{retrieved_context}\n---\nUse the above context to answer the user if relevant."
        internal_messages.append(LLMMessage(role="system", content=system_msg))
    
    # Preserve original message order and roles (Requirement 5)
    for msg in payload.messages:
        internal_messages.append(LLMMessage(role=msg.role, content=msg.content))

    # 5. Call the LLM
    try:
        llm = await get_llm(workspace_id)
        
        # Prepare execution params
        llm_kwargs = {
            "temperature": payload.temperature,
            "top_p": payload.top_p,
            "max_tokens": payload.max_tokens,
            "presence_penalty": payload.presence_penalty,
            "frequency_penalty": payload.frequency_penalty,
            "stop": payload.stop,
            "logit_bias": payload.logit_bias,
            "response_format": payload.response_format,
        }

        if payload.stream:
            async def stream_generator() -> AsyncGenerator[str, None]:
                completion_id = f"chatcmpl-{uuid.uuid4()}"
                created = int(time.time())
                
                try:
                    async for chunk in llm.stream(internal_messages, **llm_kwargs):
                        chunk_data = {
                            "id": completion_id,
                            "object": "chat.completion.chunk",
                            "created": created,
                            "model": model_name,
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": {"content": chunk},
                                    "finish_reason": None,
                                }
                            ],
                        }
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                    
                    # Final chunk with finish_reason
                    final_chunk = {
                        "id": completion_id,
                        "object": "chat.completion.chunk",
                        "created": created,
                        "model": model_name,
                        "choices": [
                            {
                                "index": 0,
                                "delta": {},
                                "finish_reason": "stop",
                            }
                        ],
                    }
                    yield f"data: {json.dumps(final_chunk)}\n\n"
                    yield "data: [DONE]\n\n"
                except Exception as e:
                    logger.error("stream_failed", error=str(e))
                    error_data = {"error": {"message": str(e), "type": "internal_error"}}
                    yield f"data: {json.dumps(error_data)}\n\n"
                    yield "data: [DONE]\n\n"

            return StreamingResponse(stream_generator(), media_type="text/event-stream")
        
        else:
            # Sync response
            response = await llm.chat(internal_messages, **llm_kwargs)
            
            # Format OpenAI-compatible JSON response
            completion_id = f"chatcmpl-{uuid.uuid4()}"
            created = int(time.time())
            
            prompt_tokens = response.usage.get("input_tokens", 0)
            completion_tokens = response.usage.get("output_tokens", 0)
            total_tokens = response.usage.get("total_tokens", prompt_tokens + completion_tokens)
            
            return ChatCompletionResponse(
                id=completion_id,
                created=created,
                model=model_name,
                choices=[
                    ChatCompletionResponseChoice(
                        index=0,
                        message=OpenAIMessage(role="assistant", content=response.content),
                        finish_reason=response.finish_reason or "stop",
                    )
                ],
                usage=ChatCompletionUsage(
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                ),
            )

    except Exception as e:
        error_str = str(e).lower()
        if "rate limit" in error_str or "quota" in error_str:
            return create_openai_error_response(
                str(e), "rate_limit_error", 429, code="rate_limit_exceeded"
            )
        
        logger.error("openai_llm_call_failed", error=str(e), workspace_id=workspace_id)
        # Avoid leaking internal error details as per Failure Handling rules
        return create_openai_error_response(
            "The model provider returned an error. Please try again later.",
            "api_error",
            500,
        )
