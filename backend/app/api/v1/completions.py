import json
import time
import uuid
import re
from typing import AsyncGenerator, List, Dict, Any, Optional

import structlog
from fastapi import APIRouter, Response, Request
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


def parse_model_name(model_name: str) -> tuple[str, str]:
    """
    Parse model name to extract provider and workspace.
    
    Format: karag:<workspace_name>
    
    Returns:
        Tuple of (provider, workspace_name)
    """
    model_parts = model_name.split(":", 1)
    if len(model_parts) < 2 or not model_parts[1]:
        return ("karag", "default")
    return (model_parts[0], model_parts[1])


def build_rag_context_with_citations(
    search_results: List[Dict[str, Any]],
    max_context_chars: int = 10000
) -> tuple[str, Dict[str, str]]:
    """
    Build RAG context from search results with citation support.
    
    Args:
        search_results: List of search results from RAG
        max_context_chars: Maximum characters for context
        
    Returns:
        Tuple of (context_string, doc_id_mapping)
        doc_id_mapping maps chunk indices to document IDs for citation
    """
    context_parts = []
    doc_id_mapping = {}
    current_chars = 0
    
    for idx, res in enumerate(search_results):
        text = res.get("text", "")
        payload = res.get("payload", {})
        doc_id = payload.get("doc_id", "unknown")
        
        if not text:
            continue
            
        # Track which chunk index maps to which doc_id
        doc_id_mapping[str(idx)] = doc_id
        
        # Format: [0] Text content... [[doc:doc_id]]
        chunk_header = f"[{idx}] "
        chunk_text = f"{chunk_header}{text}"
        
        if current_chars + len(chunk_text) > max_context_chars:
            remaining = max_context_chars - current_chars
            if remaining > 100:
                truncated = text[:remaining - len(chunk_header) - 3]
                context_parts.append(f"[{idx}] {truncated}...")
            break
            
        context_parts.append(chunk_text)
        current_chars += len(chunk_text)
    
    return "\n\n".join(context_parts), doc_id_mapping


def build_citation_prompt(context: str, num_chunks: int) -> str:
    """
    Build system prompt that instructs LLM to cite sources.
    
    Args:
        context: The retrieved context
        num_chunks: Number of context chunks
        
    Returns:
        System prompt with citation instructions
    """
    return f"""You are a helpful assistant with access to a knowledge base. Use the provided context to answer the user's question.

When referencing information from the context, you MUST cite the source using the format: [[doc:<document_id>]]

The context is organized with numbered chunks [0] through [{num_chunks-1}]. Each chunk has an associated document ID.
When you use information from a chunk, append the citation immediately after the relevant text.

Example:
- Context: [0] The sky is blue. [1] Grass is green.
- Good response: "The sky is blue [[doc:doc_123]] and grass is green [[doc:doc_456]]."

Important:
- Only cite when using specific information from the context
- Citations must be in the exact format: [[doc:<document_id>]]
- Do not make up document IDs
- If you don't know the answer, say so honestly

Context:
---
{context}
---

Answer based on the context above."""


def extract_citations_from_content(content: str) -> tuple[str, List[str]]:
    """
    Extract citations from content and return cleaned content with citation list.
    
    Args:
        content: The LLM response content
        
    Returns:
        Tuple of (content_with_citations, list_of_doc_ids)
    """
    # Find all citations in format [[doc:<document_id>]]
    citation_pattern = r'\[\[doc:([^\]]+)\]\]'
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
        self.max_citation_len = 100  # Max expected citation length
        
    def add(self, text: str) -> Optional[str]:
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


@router.get("/documents/{document_id}")
async def get_document_for_citation(document_id: str):
    """
    Retrieve a document by ID for citation reverse lookup.
    
    This endpoint allows clients to resolve [[doc:<document_id>]] citations
    from chat completions. It returns the document metadata and content.
    
    Args:
        document_id: The unique document identifier from a citation
        
    Returns:
        Document metadata and content
    """
    try:
        from backend.app.services.document.document_inspection_service import (
            DocumentInspectionService,
        )
        
        inspection_service = DocumentInspectionService()
        doc = await inspection_service.inspect_document(document_id)
        
        if not doc:
            return create_openai_error_response(
                f"Document '{document_id}' not found",
                "invalid_request_error",
                404,
            )
        
        return {
            "id": document_id,
            "filename": doc.get("filename"),
            "content_type": doc.get("content_type"),
            "workspace_id": doc.get("workspace_id"),
            "source": doc.get("source"),
            "status": doc.get("status"),
        }
    except Exception as e:
        logger.error("document_lookup_failed", document_id=document_id, error=str(e))
        return create_openai_error_response(
            "Failed to retrieve document",
            "server_error",
            500,
        )


@router.post("/chat/completions")
async def chat_completions(request: Request, payload: ChatCompletionRequest):
    """
    OpenAI-compatible Chat Completions API with RAG integration.
    
    Supports:
    - Workspace resolution via model name (karag:<workspace_name>)
    - Automatic RAG retrieval with citation support
    - Streaming and non-streaming responses
    - OpenAI-compliant error format
    
    Citation format in response: [[doc:<document_id>]]
    """
    model_name = payload.model
    logger.info("openai_chat_completion_request", model=model_name)
    
    # 1. Resolve workspace from model format karag:<workspace_name>
    provider, workspace_name = parse_model_name(model_name)
    
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
    
    workspace_id = workspace["id"]
    
    # 2. Extract query for retrieval (last user message)
    query = ""
    for msg in reversed(payload.messages):
        if msg.role == "user":
            query = msg.content
            break
    
    # 3. Retrieve relevant documents with citation support
    retrieved_context = ""
    doc_id_mapping = {}
    
    if query:
        try:
            search_results = await rag_service.search(query, workspace_id)
            if search_results:
                # Build context with citation mapping
                retrieved_context, doc_id_mapping = build_rag_context_with_citations(
                    search_results,
                    max_context_chars=10000
                )
                
                logger.info(
                    "rag_context_built",
                    workspace_id=workspace_id,
                    num_chunks=len(doc_id_mapping),
                    num_docs=len(set(doc_id_mapping.values())),
                )
        except Exception as e:
            logger.error(
                "retrieval_failed_fallback_to_llm",
                error=str(e),
                workspace_id=workspace_id,
            )
            # Fallback to LLM without documents
            retrieved_context = ""
            doc_id_mapping = {}
    
    # 4. Construct internal messages with citation instructions
    internal_messages = []
    
    # Add system message with context and citation instructions
    if retrieved_context and doc_id_mapping:
        citation_prompt = build_citation_prompt(
            retrieved_context, 
            len(doc_id_mapping)
        )
        internal_messages.append(LLMMessage(role="system", content=citation_prompt))
    
    # Preserve original message order and roles
    for msg in payload.messages:
        # Skip existing system messages if we added our own context
        if msg.role == "system" and retrieved_context:
            continue
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
        }
        
        # Filter out None values
        llm_kwargs = {k: v for k, v in llm_kwargs.items() if v is not None}

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
                }
            )
        
        else:
            # Non-streaming response
            response = await llm.chat(internal_messages, **llm_kwargs)
            
            # Content already has citations embedded from LLM
            content_with_citations = response.content
            
            # Format OpenAI-compatible JSON response
            completion_id = f"chatcmpl-{uuid.uuid4().hex[:24]}"
            created = int(time.time())
            
            prompt_tokens = response.usage.get("input_tokens", 0) if response.usage else 0
            completion_tokens = response.usage.get("output_tokens", 0) if response.usage else 0
            total_tokens = response.usage.get("total_tokens", prompt_tokens + completion_tokens) if response.usage else prompt_tokens + completion_tokens
            
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
            return create_openai_error_response(
                str(e), "rate_limit_error", 429, code="rate_limit_exceeded"
            )
        
        logger.error("openai_llm_call_failed", error=str(e), workspace_id=workspace_id)
        # Avoid leaking internal error details as per Failure Handling rules
        return create_openai_error_response(
            "The model provider returned an error. Please try again later.",
            "server_error",
            500,
        )
