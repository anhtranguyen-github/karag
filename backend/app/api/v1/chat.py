from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
import asyncio
from backend.app.services.chat_service import chat_service

from backend.app.core.exceptions import ValidationError

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/history/{thread_id}")
async def get_chat_history(thread_id: str):
    return {"messages": await chat_service.get_history(thread_id)}

@router.get("/threads")
async def list_chat_threads(workspace_id: str = "default"):
    return {"threads": await chat_service.list_threads(workspace_id)}

@router.patch("/threads/{thread_id}/title")
async def update_thread_title(thread_id: str, request: Request):
    data = await request.json()
    title = data.get("title")
    if not title:
        raise ValidationError("Title is required")
    await chat_service.update_title(thread_id, title)
    return {"status": "success", "title": title}

@router.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str):
    await chat_service.delete_thread(thread_id)
    return {"status": "success", "message": f"Thread {thread_id} deleted"}

@router.post("/stream")
async def chat_stream(request: Request):
    data = await request.json()
    message = data.get("message")
    thread_id = data.get("thread_id", "default")
    workspace_id = data.get("workspace_id", "default")
    
    # Spawn title generation in background
    asyncio.create_task(chat_service.generate_title(message, thread_id, workspace_id))
    
    return StreamingResponse(
        chat_service.stream_updates(message, thread_id, workspace_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
