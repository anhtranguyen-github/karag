from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import structlog
from backend.app.services.chat_service import chat_service
from backend.app.schemas.chat import ChatStreamRequest, ThreadTitleUpdate
from backend.app.schemas.base import AppResponse

logger = structlog.get_logger(__name__)

from backend.app.api.deps import get_current_workspace

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["chat"])


@router.get("/history/{thread_id}", response_model=AppResponse)
async def get_chat_history(
    thread_id: str, current_workspace: dict = Depends(get_current_workspace)
):
    history = await chat_service.get_history(thread_id)
    return AppResponse.success_response(data=history)


@router.get("/threads", response_model=AppResponse)
async def list_chat_threads(current_workspace: dict = Depends(get_current_workspace)):
    threads = await chat_service.list_threads(current_workspace["id"])
    return AppResponse.success_response(data=threads)


@router.patch("/threads/{thread_id}/title", response_model=AppResponse)
async def update_thread_title(
    thread_id: str,
    payload: ThreadTitleUpdate,
    current_workspace: dict = Depends(get_current_workspace),
):
    await chat_service.update_title(thread_id, payload.title)
    return AppResponse.success_response(
        data={"title": payload.title}, message="Thread title updated"
    )


@router.get("/threads/{thread_id}", response_model=AppResponse)
async def get_thread(
    thread_id: str, current_workspace: dict = Depends(get_current_workspace)
):
    thread = await chat_service.get_thread(thread_id)
    return AppResponse.success_response(data=thread)


@router.delete("/threads/{thread_id}", response_model=AppResponse)
async def delete_thread(
    thread_id: str, current_workspace: dict = Depends(get_current_workspace)
):
    await chat_service.delete_thread(thread_id)
    return AppResponse.success_response(
        data=None, message=f"Thread {thread_id} deleted"
    )


@router.post("/stream")
async def chat_stream(
    payload: ChatStreamRequest,
    current_workspace: dict = Depends(get_current_workspace),
):
    """
    Stream chat updates using SSE.
    Spawns background title generation for consistent UX.
    """
    logger.info("chat_stream_request", payload=payload.model_dump())

    return StreamingResponse(
        chat_service.stream_updates(
            payload.message,
            payload.thread_id,
            current_workspace["id"],
            payload.execution,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
