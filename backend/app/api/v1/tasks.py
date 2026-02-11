from fastapi import APIRouter, BackgroundTasks
from backend.app.services.task_service import task_service
from backend.app.core.exceptions import NotFoundError
from backend.app.schemas.base import AppResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/")
async def list_tasks(type: str = None, workspace_id: str = None):
    """List tasks, optionally filtered by type and workspace."""
    tasks = await task_service.list_tasks(task_type=type, workspace_id=workspace_id)
    return AppResponse.success_response(data=tasks)


@router.get("/{task_id}")
async def get_task_status(task_id: str):
    """Get the current status of a specific task."""
    task = await task_service.get_task(task_id)
    if not task:
        raise NotFoundError(f"Task '{task_id}' not found")
    return AppResponse.success_response(data=task)


@router.post("/{task_id}/retry")
async def retry_task(task_id: str, background_tasks: BackgroundTasks):
    """Mark a failed task as retryable and re-dispatch it to background workers."""
    # Import locally to avoid circular dependencies if any exist in the future
    from backend.app.services.document_service import document_service

    task = await task_service.get_task(task_id)
    if not task:
        raise NotFoundError(f"Task '{task_id}' not found")
    
    if task["status"] != "failed":
        return {"status": "ignored", "message": "Only failed tasks can be retried."}

    task_type = task.get("type")
    metadata = task.get("metadata", {})
    workspace_id = task.get("workspace_id")

    # Dispatch logic based on task type
    if task_type == "ingestion":
        # Ingestion requires original file content or download logic which isn't persisted
        return {
            "status": "error", 
            "message": "Cannot retry ingestion tasks. Please upload the document again."
        }

    elif task_type == "indexing":
        if not metadata.get("filename"):
            return {"status": "error", "message": "Task metadata missing filename."}
            
        await task_service.mark_retryable(task_id)
        background_tasks.add_task(
            document_service.run_index_background,
            task_id=task_id,
            doc_id_or_name=metadata["filename"],
            workspace_id=workspace_id,
            force=True
        )

    elif task_type == "workspace_op":
        # metadata['workspace_id'] stored the TARGET workspace ID in create_task call
        if not metadata.get("filename") or not metadata.get("workspace_id"):
             return {"status": "error", "message": "Task metadata missing required fields."}

        await task_service.mark_retryable(task_id)
        background_tasks.add_task(
             document_service.run_workspace_op_background,
             task_id=task_id,
             name=metadata["filename"],
             target_workspace_id=metadata["workspace_id"],
             action=metadata.get("operation", "share"),
             force_reindex=False
        )
    
    else:
        return {"status": "error", "message": f"Unknown task type: {task_type}"}

    return AppResponse.success_response(data={"task_id": task_id}, message="Task retry initialized")


@router.post("/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Cancel a pending or processing task."""
    task = await task_service.get_task(task_id)
    if not task:
        raise NotFoundError(f"Task '{task_id}' not found")
    
    if task["status"] in ["completed", "failed", "canceled"]:
        return {"status": "ignored", "message": f"Task already {task['status']}."}

    await task_service.cancel_task(task_id)
    return AppResponse.success_response(data={"task_id": task_id}, message=f"Task {task_id} canceled")


@router.delete("/cleanup")
async def cleanup_tasks(older_than_hours: int = 24):
    """Remove completed/failed tasks older than the given number of hours."""
    await task_service.cleanup_old_tasks(older_than_hours)
    return AppResponse.success_response(message="Task logs pruned")
