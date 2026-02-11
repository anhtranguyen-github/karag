"""
Persistent Task Service — MongoDB-backed job tracking.

All long-running operations (upload, indexing, linking, move/share)
create a Task record that persists across server restarts.
"""
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

import structlog
from backend.app.core.mongodb import mongodb_manager

logger = structlog.get_logger(__name__)


class TaskService:
    """MongoDB-persisted task tracker for background document operations."""

    COLLECTION = "tasks"

    # ── Create ──────────────────────────────────────────────
    async def create_task(
        self,
        task_type: str,
        metadata: Optional[Dict] = None,
        workspace_id: Optional[str] = None,
    ) -> str:
        db = mongodb_manager.get_async_database()
        task_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        record = {
            "id": task_id,
            "type": task_type,
            "status": "pending",
            "progress": 0,
            "message": "Initializing...",
            "error_code": None,
            "metadata": metadata or {},
            "workspace_id": workspace_id or (metadata or {}).get("workspace_id", "default"),
            "result": None,
            "created_at": now,
            "updated_at": now,
        }
        await db[self.COLLECTION].insert_one(record)
        logger.info("task_created", task_id=task_id, task_type=task_type)
        return task_id

    # ── Update ──────────────────────────────────────────────
    async def update_task(
        self,
        task_id: str,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        message: Optional[str] = None,
        error_code: Optional[str] = None,
        metadata: Optional[Dict] = None,
        result: Optional[Dict] = None,
    ):
        db = mongodb_manager.get_async_database()
        update: Dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}
        if status is not None:
            update["status"] = status
        if progress is not None:
            update["progress"] = progress
        if message is not None:
            update["message"] = message
        if error_code is not None:
            update["error_code"] = error_code
        if result is not None:
            update["result"] = result

        set_op: Dict[str, Any] = {"$set": update}
        if metadata:
            for k, v in metadata.items():
                set_op["$set"][f"metadata.{k}"] = v

        await db[self.COLLECTION].update_one({"id": task_id}, set_op)

    # ── Read ────────────────────────────────────────────────
    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        db = mongodb_manager.get_async_database()
        doc = await db[self.COLLECTION].find_one({"id": task_id})
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def list_tasks(
        self,
        task_type: Optional[str] = None,
        workspace_id: Optional[str] = None,
        include_completed: bool = True,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        db = mongodb_manager.get_async_database()
        query: Dict[str, Any] = {}
        if task_type:
            query["type"] = task_type
        if workspace_id:
            query["workspace_id"] = workspace_id
        if not include_completed:
            query["status"] = {"$in": ["pending", "processing"]}

        cursor = db[self.COLLECTION].find(query).sort("created_at", -1).limit(limit)
        tasks = await cursor.to_list(length=limit)
        for t in tasks:
            if "_id" in t:
                t["_id"] = str(t["_id"])
        return tasks

    # ── Cleanup ─────────────────────────────────────────────
    async def cleanup_old_tasks(self, older_than_hours: int = 24):
        """Remove completed/failed/canceled tasks older than the specified window."""
        db = mongodb_manager.get_async_database()
        cutoff = (datetime.utcnow() - timedelta(hours=older_than_hours)).isoformat()
        result = await db[self.COLLECTION].delete_many({
            "status": {"$in": ["completed", "failed", "canceled"]},
            "updated_at": {"$lt": cutoff},
        })
        if result.deleted_count > 0:
            logger.info("tasks_cleaned", deleted=result.deleted_count, cutoff_hours=older_than_hours)

    # ── Retry & Cancel ──────────────────────────────────────
    async def mark_retryable(self, task_id: str):
        """Reset a failed task to pending for retry."""
        await self.update_task(task_id, status="pending", progress=0, message="Retrying...")

    async def cancel_task(self, task_id: str):
        """Mark task as canceled."""
        await self.update_task(task_id, status="canceled", message="Task canceled by user.")

    async def is_cancelled(self, task_id: str) -> bool:
        """Check if task has been canceled."""
        task = await self.get_task(task_id)
        # Check specific status or if task was deleted
        return not task or task.get("status") == "canceled"


task_service = TaskService()
