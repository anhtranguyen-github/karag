import json
import re
import time
import uuid
from collections.abc import AsyncGenerator
from typing import Annotated, Any

import structlog
from backend.app.api.deps import CurrentUser, get_current_user
from backend.app.core.mongodb import mongodb_manager
from backend.app.providers.base import LLMMessage
from backend.app.providers.llm import get_llm
from backend.app.rag.rag_service import rag_service
from backend.app.schemas.documents import DocumentCitationResponse
from backend.app.schemas.openai import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionResponseChoice,
    ChatCompletionUsage,
    ModelInfo,
    ModelsResponse,
    OpenAIError,
    OpenAIErrorResponse,
    OpenAIMessage,
)
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/v1", tags=["openai"])

# Type alias for cleaner route signatures
UserDep = Annotated[CurrentUser, Depends(get_current_user)]


async def verify_workspace_access(user: CurrentUser, workspace_id: str) -> bool:
    """
    Verify that the user has access to the specified workspace.

    Args:
        user: The authenticated user
        workspace_id: The workspace ID to check

    Returns:
        True if user has access, False otherwise
    """
    # Admin users have access to all workspaces
    if user.is_admin:
        return True

    # Check if workspace is public
    db = mongodb_manager.get_async_database()
    workspace = await db.workspaces.find_one({"id": workspace_id})

    if workspace and workspace.get("is_public", False):
        return True

    # Check user's workspace membership
    user_doc = await db.users.find_one({"id": user.id})
    if user_doc:
        user_workspaces = user_doc.get("workspaces", [])
        if workspace_id in user_workspaces:
            return True

    return False


def create_openai_error_response(message: str, error_type: str, status_code: int = 400, code: str = None) -> Response:
    """Create a standardized OpenAI-style error response."""
    error = OpenAIError(message=message, type=error_type, code=code)
    return Response(
        content=OpenAIErrorResponse(error=error).model_dump_json(),
        status_code=status_code,
        media_type="application/json",
    )


def parse_model_name(model_name: str) -> tuple[str, str, str | None]:
    """
    Parse model name to extract provider, workspace, and mode.

    Formats:
    - karag:<workspace_name>
    - karag:<workspace_name>:<mode>

    Returns:
        Tuple of (provider, workspace_name, mode)
    """
    model_parts = model_name.split(":")

    if len(model_parts) < 2 or not model_parts[1]:
        return ("karag", "default", None)

    provider = model_parts[0]
    workspace_name = model_parts[1]
    mode = model_parts[2] if len(model_parts) > 2 else None

    return (provider, workspace_name, mode)


def extract_mode_from_messages(messages: list[OpenAIMessage]) -> str | None:
    """
    Extract mode from system message if present.

    Mode can be specified in system message as:
    - [mode:chat] or [mode:qa] or [mode:tutor] or [mode:strict_rag]

    Returns:
        Mode string if found, None otherwise
    """
    for msg in messages:
        if msg.role == "system":
            mode_match = re.search(r"\[mode:(\w+)\]", msg.content)
            if mode_match:
                return mode_match.group(1)
    return None


def build_rag_context_with_citations(search_results: list[dict[str, Any]], max_context_chars: int = 10000) -> str:
    """
    Build RAG context from search results with direct document ID citations.

    The context is formatted so that LLM can directly cite using [[doc:<document_id>]]
    format without needing index mapping.

    Args:
        search_results: List of search results from RAG
        max_context_chars: Maximum characters for context

    Returns:
        Context string with document IDs embedded for direct citation
    """
    context_parts = []
    current_chars = 0
    seen_doc_ids = set()

    for res in search_results:
        text = res.get("text", "")
        payload = res.get("payload", {})
        doc_id = payload.get("doc_id", "unknown")

        if not text:
            continue

        # Format: Text content... [[doc:document_id]]
        # The citation is embedded directly in the context
        chunk_text = f"{text} [[doc:{doc_id}]]"

        if current_chars + len(chunk_text) > max_context_chars:
            remaining = max_context_chars - current_chars
            if remaining > 100:
                truncated = text[: remaining - 50]
                context_parts.append(f"{truncated}... [[doc:{doc_id}]]")
            break

        context_parts.append(chunk_text)
        current_chars += len(chunk_text)
        seen_doc_ids.add(doc_id)

    return "\n\n".join(context_parts)


def build_citation_prompt(context: str, mode: str | None = None) -> str:
    """
    Build system prompt that instructs LLM to cite sources.

    Args:
        context: The retrieved context
        mode: Optional chat mode (chat, qa, tutor, strict_rag)

    Returns:
        System prompt with citation instructions
    """
    # Mode-specific instructions
    mode_instructions = {
        "qa": """You are a precise Q&A assistant. Answer questions based ONLY on the provided context.
If the answer is not in the context, respond EXACTLY: "Not found in the provided documents."
Be concise and factual.""",
        "tutor": """You are a helpful tutor. Explain concepts based on the provided context.
Use examples from the context when possible. Be encouraging but accurate.
If information isn't in the context, say so clearly.""",
        "strict_rag": """You are a strict RAG assistant. You may ONLY use information from the provided context.
If the answer cannot be found in the context, respond EXACTLY: "Not found in the provided documents."
Do not use your general knowledge.""",
        "chat": """You are a helpful assistant with access to a knowledge base. Use the provided context to answer questions.
You may supplement with general knowledge when appropriate, but prioritize context information.""",
    }

    base_instruction = mode_instructions.get(mode, mode_instructions["chat"])

    return f"""{base_instruction}

When referencing information from the context, you MUST cite the source using the format: [[doc:<document_id>]]

The context contains embedded citations in the format [[doc:<document_id>]] after each text segment.
When you use information, include the citation immediately after the relevant text.

Example:
- Context: The sky is blue. [[doc:doc_123]] Grass is green. [[doc:doc_456]]
- Good response: "The sky is blue [[doc:doc_123]] and grass is green [[doc:doc_456]]."

Important:
- Only cite when using specific information from the context
- Citations must be in the exact format: [[doc:<document_id>]]
- Do not make up document IDs
- Include citations naturally in the text flow

Context:
---
{context}
---

Answer based on the context above."""


def extract_citations_from_content(content: str) -> tuple[str, list[str]]:
    """
    Extract citations from content and return cleaned content with citation list.

    Args:
        content: The LLM response content

    Returns:
        Tuple of (content_with_citations, list_of_doc_ids)
    """
    # Find all citations in format [[doc:<document_id>]]
    citation_pattern = r"\[\[doc:([^\]]+)\]\]"
    citations = re.findall(citation_pattern, content)

    # Content already has citations embedded, return as-is
    return content, list(set(citations))  # Remove duplicates


class CitationBuffer:
    """
    Buffer for streaming responses to ensure citation tokens are atomic.

    Citation format: [[doc:<document_id>]]
    Must never be split across chunks.
    """

    def __init__(self):
        self.buffer = ""
        self.max_citation_len = 150  # Max expected citation length

    def add(self, text: str) -> str | None:
        """
        Add text to buffer and return any complete, safe content.

        Args:
            text: New text chunk from LLM

        Returns:
            Safe content to send, or None if buffering
        """
        self.buffer += text

        # Check if buffer contains a potential citation start
        citation_start = self.buffer.find("[[")

        if citation_start == -1:
            # No citation start, flush entire buffer
            result = self.buffer
            self.buffer = ""
            return result

        # Check if we have a complete citation
        citation_end = self.buffer.find("]]", citation_start)

        if citation_end != -1:
            # Complete citation found, flush up to and including it
            end_pos = citation_end + 2
            result = self.buffer[:end_pos]
            self.buffer = self.buffer[end_pos:]
            return result

        # Incomplete citation - check if we need to flush before it
        if citation_start > 0:
            # Flush content before citation start
            result = self.buffer[:citation_start]
            self.buffer = self.buffer[citation_start:]
            return result

        # Buffer contains only incomplete citation
        # Check if buffer is getting too long (not a valid citation)
        if len(self.buffer) > self.max_citation_len:
            # Flush as it's not a valid citation
            result = self.buffer
            self.buffer = ""
            return result

        # Still buffering for potential citation
        return None

    def flush(self) -> str:
        """Flush remaining buffer content."""
        result = self.buffer
        self.buffer = ""
        return result


@router.get("/documents/{document_id}", response_model=DocumentCitationResponse)
async def get_document_for_citation(
    document_id: str,
    workspace_id: str,
    user: UserDep,
):
    """
    Retrieve a document by ID for citation reverse lookup.

    This endpoint allows clients to resolve [[doc:<document_id>]] citations
    from chat completions. It returns the document metadata and content preview.

    Requires authentication and workspace access authorization.

    Args:
        document_id: The unique document identifier from a citation
        workspace_id: Required workspace ID for access validation
        user: Authenticated user context

    Returns:
        DocumentCitationResponse with metadata and content preview

    Raises:
        HTTPException: If user lacks workspace access or document not found
    """
    # Verify user has access to the workspace
    has_access = await verify_workspace_access(user, workspace_id)
    if not has_access:
        logger.warning(
            "unauthorized_document_access_attempt",
            document_id=document_id,
            workspace_id=workspace_id,
            user_id=user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "code": "ACCESS_DENIED",
                "message": "You do not have access to this workspace",
            },
        )

    try:
        from backend.app.services.document.document_inspection_service import (
            DocumentInspectionService,
        )

        inspection_service = DocumentInspectionService()
        doc = await inspection_service.get_by_id(document_id)

        if not doc:
            return create_openai_error_response(
                f"Document '{document_id}' not found",
                "invalid_request_error",
                404,
                code="document_not_found",
            )

        # Verify workspace isolation - workspace_id is now required
        doc_workspace_id = doc.get("workspace_id")
        if doc_workspace_id != workspace_id:
            logger.warning(
                "cross_workspace_document_access_attempt",
                document_id=document_id,
                requested_workspace=workspace_id,
                actual_workspace=doc_workspace_id,
                user_id=user.id,
            )
            return create_openai_error_response(
                f"Document '{document_id}' not found in workspace",
                "invalid_request_error",
                404,
                code="document_not_found",
            )

        # Get content preview (first 5000 chars)
        content_preview = None
        if doc.get("content"):
            content_preview = doc["content"][:5000]

        return DocumentCitationResponse(
            id=document_id,
            filename=doc.get("filename", "Unknown"),
            content_type=doc.get("content_type", "application/octet-stream"),
            workspace_id=doc_workspace_id or "unknown",
            source=doc.get("source"),
            status=doc.get("status", "unknown"),
            content_preview=content_preview,
            created_at=doc.get("created_at"),
        )
    except Exception as e:
        logger.error("document_lookup_failed", document_id=document_id, error=str(e))
        return create_openai_error_response(
            "Failed to retrieve document",
            "server_error",
            500,
        )


@router.post("/chat/completions")
async def chat_completions(
    request: Request,
    payload: ChatCompletionRequest,
    user: UserDep,
):
    """
    OpenAI-compatible Chat Completions API with RAG integration.

    Supports:
    - Workspace resolution via model name (karag:<workspace_name> or karag:<workspace>:<mode>)
    - Mode extraction from model name or system messages
    - Automatic RAG retrieval with citation support
    - Streaming and non-streaming responses
    - OpenAI-compliant error format

    Requires authentication and workspace access authorization.

    Citation format in response: [[doc:<document_id>]]
    """
    model_name = payload.model
    logger.info("openai_chat_completion_request", model=model_name, user_id=user.id)

    # 1. Resolve workspace from model format karag:<workspace_name> or karag:<workspace>:<mode>
    provider, workspace_name, mode_from_model = parse_model_name(model_name)

    if provider != "karag":
        return create_openai_error_response(
            f"Unsupported provider '{provider}'. Must be 'karag'.",
            "invalid_request_error",
            400,
        )

    db = mongodb_manager.get_async_database()
    workspace = await db.workspaces.find_one({"name": workspace_name})

    if not workspace:
        return create_openai_error_response(
            f"Workspace '{workspace_name}' does not exist.",
            "invalid_request_error",
            404,
        )

    # 1.5 Verify user has access to the workspace
    workspace_id = workspace["id"]
    has_access = await verify_workspace_access(user, workspace_id)
    if not has_access:
        logger.warning(
            "unauthorized_chat_completion_attempt",
            workspace_id=workspace_id,
            workspace_name=workspace_name,
            user_id=user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "code": "ACCESS_DENIED",
                "message": "You do not have access to this workspace",
            },
        )

    # 2. Extract mode (from model name or system message)
    mode_from_messages = extract_mode_from_messages(payload.messages)
    mode = mode_from_model or mode_from_messages or "chat"

    logger.info(
        "workspace_resolved",
        workspace_id=workspace_id,
        workspace_name=workspace_name,
        mode=mode,
    )

    # 3. Extract query for retrieval (last user message)
    query = ""
    for msg in reversed(payload.messages):
        if msg.role == "user":
            query = msg.content
            break

    # 4. Retrieve relevant documents with citation support
    retrieved_context = ""
    has_documents = False

    if query:
        try:
            search_results = await rag_service.search(query, workspace_id)
            if search_results:
                # Build context with embedded document IDs for citations
                retrieved_context = build_rag_context_with_citations(search_results, max_context_chars=10000)
                has_documents = True

                logger.info(
                    "rag_context_built",
                    workspace_id=workspace_id,
                    num_results=len(search_results),
                    mode=mode,
                )
        except Exception as e:
            logger.error(
                "retrieval_failed",
                error=str(e),
                workspace_id=workspace_id,
            )
            # Continue without context on retrieval failure
            retrieved_context = ""

    # 5. Construct internal messages with citation instructions
    internal_messages = []

    # Add system message with context and citation instructions
    if has_documents and retrieved_context:
        citation_prompt = build_citation_prompt(retrieved_context, mode)
        internal_messages.append(LLMMessage(role="system", content=citation_prompt))
    elif mode == "strict_rag" or mode == "qa":
        # For strict modes, add instruction even without documents
        no_doc_prompt = """You are a strict Q&A assistant. Answer based ONLY on provided documents.
If no documents are provided or the answer cannot be found, respond EXACTLY: "Not found in the provided documents."
Do not use general knowledge."""
        internal_messages.append(LLMMessage(role="system", content=no_doc_prompt))

    # Preserve original message order and roles (skip system messages if we added our own)
    user_system_skipped = False
    for msg in payload.messages:
        if msg.role == "system" and (has_documents or mode in ("strict_rag", "qa")) and not user_system_skipped:
            # Skip the first system message as we replaced it
            user_system_skipped = True
            continue
        internal_messages.append(LLMMessage(role=msg.role, content=msg.content))

    # 6. Call the LLM
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
        }

        # Filter out None values
        llm_kwargs = {k: v for k, v in llm_kwargs.items() if v is not None}

        # Mode-specific parameter adjustments
        if mode == "strict_rag":
            llm_kwargs["temperature"] = llm_kwargs.get("temperature", 0.7) * 0.5  # Lower temp for strict mode

        if payload.stream:

            async def stream_generator() -> AsyncGenerator[str, None]:
                completion_id = f"chatcmpl-{uuid.uuid4().hex[:24]}"
                created = int(time.time())
                citation_buffer = CitationBuffer()

                try:
                    async for chunk in llm.stream(internal_messages, **llm_kwargs):
                        # Buffer to ensure citation tokens are atomic
                        safe_content = citation_buffer.add(chunk)

                        if safe_content:
                            chunk_data = {
                                "id": completion_id,
                                "object": "chat.completion.chunk",
                                "created": created,
                                "model": model_name,
                                "choices": [
                                    {
                                        "index": 0,
                                        "delta": {"content": safe_content},
                                        "finish_reason": None,
                                    }
                                ],
                            }
                            yield f"data: {json.dumps(chunk_data)}\n\n"

                    # Flush any remaining buffered content
                    remaining = citation_buffer.flush()
                    if remaining:
                        chunk_data = {
                            "id": completion_id,
                            "object": "chat.completion.chunk",
                            "created": created,
                            "model": model_name,
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": {"content": remaining},
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
                    error_data = {
                        "error": {
                            "message": "The model provider returned an error. Please try again later.",
                            "type": "server_error",
                        }
                    }
                    yield f"data: {json.dumps(error_data)}\n\n"
                    yield "data: [DONE]\n\n"

            return StreamingResponse(
                stream_generator(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )

        else:
            # Non-streaming response
            response = await llm.chat(internal_messages, **llm_kwargs)

            # Content already has citations embedded from LLM
            content_with_citations = response.content

            # Handle strict modes - check if response contains actual citations
            if mode in ("strict_rag", "qa") and has_documents:
                # Extract citations to verify grounding
                _, citations = extract_citations_from_content(content_with_citations)
                if not citations and "not found" not in content_with_citations.lower():
                    # No citations found - might be hallucination
                    logger.warning(
                        "no_citations_in_response",
                        workspace_id=workspace_id,
                        mode=mode,
                    )

            # Format OpenAI-compatible JSON response
            completion_id = f"chatcmpl-{uuid.uuid4().hex[:24]}"
            created = int(time.time())

            prompt_tokens = response.usage.get("input_tokens", 0) if response.usage else 0
            completion_tokens = response.usage.get("output_tokens", 0) if response.usage else 0
            total_tokens = (
                response.usage.get("total_tokens", prompt_tokens + completion_tokens)
                if response.usage
                else prompt_tokens + completion_tokens
            )

            return ChatCompletionResponse(
                id=completion_id,
                created=created,
                model=model_name,
                choices=[
                    ChatCompletionResponseChoice(
                        index=0,
                        message=OpenAIMessage(role="assistant", content=content_with_citations),
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
            return create_openai_error_response(str(e), "rate_limit_error", 429, code="rate_limit_exceeded")

        logger.error("openai_llm_call_failed", error=str(e), workspace_id=workspace_id)
        # Avoid leaking internal error details as per Failure Handling rules
        return create_openai_error_response(
            "The model provider returned an error. Please try again later.",
            "server_error",
            500,
        )


@router.get("/models")
async def list_models(user: UserDep) -> ModelsResponse:
    """
    List available models (workspaces) in OpenAI-compatible format.

    Each workspace is exposed as a model in the format: karag:<workspace_name>
    This allows OpenAI SDK clients to discover available workspaces.

    Only returns workspaces the authenticated user has access to.

    Args:
        user: Authenticated user context

    Returns:
        ModelsResponse with list of accessible workspaces as models
    """
    try:
        db = mongodb_manager.get_async_database()

        # Build query based on user access
        if user.is_admin:
            # Admins see all workspaces
            query = {}
        else:
            # Regular users see public workspaces and their assigned workspaces
            user_doc = await db.users.find_one({"id": user.id})
            user_workspaces = user_doc.get("workspaces", []) if user_doc else []
            query = {
                "$or": [
                    {"is_public": True},
                    {"id": {"$in": user_workspaces}},
                ]
            }

        workspaces = await db.workspaces.find(query).to_list(1000)

        models = []
        created_timestamp = int(time.time())

        for ws in workspaces:
            workspace_name = ws.get("name", "unknown")
            model_id = f"karag:{workspace_name}"

            models.append(
                ModelInfo(
                    id=model_id,
                    created=created_timestamp,
                    owned_by="karag",
                )
            )

        # Always include a default model
        models.append(
            ModelInfo(
                id="karag:default",
                created=created_timestamp,
                owned_by="karag",
            )
        )

        return ModelsResponse(data=models)

    except Exception as e:
        logger.error("list_models_failed", error=str(e), user_id=user.id)
        # Return empty list on error
        return ModelsResponse(data=[])


@router.get("/models/{model_id}")
async def get_model(model_id: str, user: UserDep):
    """
    Get a specific model (workspace) by ID.

    Requires authentication and workspace access authorization.

    Args:
        model_id: The model ID in format karag:<workspace_name>
        user: Authenticated user context

    Returns:
        ModelInfo for the specified workspace if user has access

    Raises:
        HTTPException: If user lacks workspace access or model not found
    """
    try:
        provider, workspace_name, _ = parse_model_name(model_id)

        if provider != "karag":
            return create_openai_error_response(
                f"Unsupported provider '{provider}'",
                "invalid_request_error",
                400,
            )

        db = mongodb_manager.get_async_database()
        workspace = await db.workspaces.find_one({"name": workspace_name})

        if not workspace:
            return create_openai_error_response(
                f"Model '{model_id}' not found",
                "invalid_request_error",
                404,
                code="model_not_found",
            )

        # Verify user has access to the workspace
        workspace_id = workspace["id"]
        has_access = await verify_workspace_access(user, workspace_id)
        if not has_access:
            logger.warning(
                "unauthorized_model_access_attempt",
                model_id=model_id,
                workspace_id=workspace_id,
                user_id=user.id,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "code": "ACCESS_DENIED",
                    "message": "You do not have access to this workspace",
                },
            )

        return ModelInfo(
            id=model_id,
            created=int(time.time()),
            owned_by="karag",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_model_failed", model_id=model_id, error=str(e), user_id=user.id)
        return create_openai_error_response(
            "Failed to retrieve model",
            "server_error",
            500,
        )
