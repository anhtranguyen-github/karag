from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
import asyncio
from backend.app.services.chat_service import chat_service
from backend.app.schemas.chat import ChatStreamRequest, ThreadTitleUpdate, ChatMessage, ChatThread
from backend.app.schemas.base import AppResponse
from backend.app.core.exceptions import ValidationError

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/history/{thread_id}", response_model=AppResponse)
async def get_chat_history(thread_id: str):
    history = await chat_service.get_history(thread_id)
    return AppResponse.success_response(data=history)

@router.get("/threads", response_model=AppResponse)
async def list_chat_threads(workspace_id: str):
    threads = await chat_service.list_threads(workspace_id)
    return AppResponse.success_response(data=threads)

@router.patch("/threads/{thread_id}/title", response_model=AppResponse)
async def update_thread_title(thread_id: str, payload: ThreadTitleUpdate):
    await chat_service.update_title(thread_id, payload.title)
    return AppResponse.success_response(
        data={"title": payload.title}, 
        message="Thread title updated"
    )

@router.delete("/threads/{thread_id}", response_model=AppResponse)
async def delete_thread(thread_id: str):
    await chat_service.delete_thread(thread_id)
    return AppResponse.success_response(data=None, message=f"Thread {thread_id} deleted")

@router.post("/stream")
async def chat_stream(payload: ChatStreamRequest):
    """
    Stream chat updates using SSE.
    Spawns background title generation for consistent UX.
    """
    # Spawn title generation in background (non-blocking)
    asyncio.create_task(
        chat_service.generate_title(payload.message, payload.thread_id, payload.workspace_id)
    )
    
    return StreamingResponse(
        chat_service.stream_updates(payload.message, payload.thread_id, payload.workspace_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
