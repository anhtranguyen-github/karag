from fastapi import APIRouter
from backend.app.services.task_service import task_service

from backend.app.core.exceptions import NotFoundError

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("/")
async def list_tasks(type: str = None):
    return {"tasks": task_service.list_tasks(type)}

@router.get("/{task_id}")
async def get_task_status(task_id: str):
    task = task_service.get_task(task_id)
    if not task:
        raise NotFoundError(f"Task '{task_id}' not found")
    return task
