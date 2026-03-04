"""
Chat API Routes.

Provides endpoints for chat functionality including:
- Streaming chat responses with SSE
- Chat history management
- Thread management (CRUD operations)
- Title generation and updates

All endpoints are workspace-scoped for proper multi-tenancy.
"""

from __future__ import annotations

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse

from backend.app.api.deps import CurrentWorkspace, get_current_workspace
from backend.app.api.pagination import (
    PaginationParams,
    create_paginated_response,
    generate_link_header,
)
from backend.app.schemas.base import AppResponse
from backend.app.schemas.chat import ChatStreamRequest, ThreadTitleUpdate
from backend.app.services.chat_service import chat_service

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["chat"])

# Type alias for cleaner route signatures
WorkspaceDep = Annotated[CurrentWorkspace, Depends(get_current_workspace)]


@router.get("/history/{thread_id}", response_model=AppResponse)
async def get_chat_history(
    thread_id: str,
    workspace: WorkspaceDep,
) -> AppResponse:
    """
    Get chat history for a specific thread.

    Args:
        thread_id: The unique identifier of the chat thread
        workspace: Current workspace context

    Returns:
        AppResponse containing the chat history
    """
    history = await chat_service.get_history(thread_id)
    return AppResponse.success_response(data=history)


@router.get("/threads", response_model=AppResponse)
async def list_chat_threads(
    response: Response,
    pagination: Annotated[PaginationParams, Depends()],
    workspace: WorkspaceDep,
) -> AppResponse:
    """
    List chat threads with pagination support.

    Args:
        response: FastAPI response object for setting headers
        pagination: Pagination parameters
        workspace: Current workspace context

    Returns:
        Paginated list of chat threads

    Headers:
        Link: RFC 8288 compliant pagination links (HATEOAS)
    """
    all_threads = await chat_service.list_threads(workspace.id)

    # Apply pagination
    total = len(all_threads)
    paginated = all_threads[pagination.offset : pagination.offset + pagination.limit]

    # Generate link header for HATEOAS
    base_url = f"/api/v1/workspaces/{workspace.id}/chat/threads"
    link_header = generate_link_header(base_url, pagination, total)
    if link_header:
        response.headers["Link"] = link_header

    return create_paginated_response(paginated, total, pagination)


@router.patch("/threads/{thread_id}/title", response_model=AppResponse)
async def update_thread_title(
    thread_id: str,
    payload: ThreadTitleUpdate,
    workspace: WorkspaceDep,
) -> AppResponse:
    """
    Update the title of a chat thread.

    Args:
        thread_id: The unique identifier of the chat thread
        payload: Contains the new title
        workspace: Current workspace context

    Returns:
        AppResponse confirming the update
    """
    await chat_service.update_title(thread_id, payload.title)
    return AppResponse.success_response(
        data={"title": payload.title},
        message="Thread title updated successfully",
    )


@router.get("/threads/{thread_id}", response_model=AppResponse)
async def get_thread(
    thread_id: str,
    workspace: WorkspaceDep,
) -> AppResponse:
    """
    Get a specific chat thread by ID.

    Args:
        thread_id: The unique identifier of the chat thread
        workspace: Current workspace context

    Returns:
        AppResponse containing the thread details
    """
    thread = await chat_service.get_thread(thread_id)
    return AppResponse.success_response(data=thread)


@router.delete("/threads/{thread_id}", response_model=AppResponse)
async def delete_thread(
    thread_id: str,
    workspace: WorkspaceDep,
) -> AppResponse:
    """
    Delete a chat thread.

    Args:
        thread_id: The unique identifier of the chat thread
        workspace: Current workspace context

    Returns:
        AppResponse confirming the deletion
    """
    await chat_service.delete_thread(thread_id)
    return AppResponse.success_response(
        data=None,
        message=f"Thread {thread_id} deleted successfully",
    )


@router.post("/stream")
async def chat_stream(
    payload: ChatStreamRequest,
    workspace: WorkspaceDep,
) -> StreamingResponse:
    """
    Stream chat updates using Server-Sent Events (SSE).

    This endpoint streams chat responses in real-time and spawns
    background title generation for a consistent UX.

    Args:
        payload: Chat stream request containing message and configuration
        workspace: Current workspace context

    Returns:
        StreamingResponse with text/event-stream content type

    Example:
        Client connects and receives SSE events:
        - data: {"type": "token", "content": "Hello"}
        - data: {"type": "token", "content": " world"}
        - data: {"type": "done"}
    """
    logger.info(
        "chat_stream_request",
        workspace_id=workspace.id,
        thread_id=payload.thread_id,
        has_execution=bool(payload.execution),
    )

    return StreamingResponse(
        chat_service.stream_updates(
            message=payload.message,
            thread_id=payload.thread_id,
            workspace_id=workspace.id,
            execution=payload.execution,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
