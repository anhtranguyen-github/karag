"""
Persistent Task Service — MongoDB-backed job tracking.

All long-running operations (upload, indexing, linking, move/share)
create a Task record that persists across server restarts.
"""

import uuid
from datetime import datetime, timedelta
from typing import Any

import structlog
from backend.app.repositories.task_repository import task_repository
from backend.app.schemas.task import Task

logger = structlog.get_logger(__name__)


class TaskService:
    """MongoDB-persisted task tracker for background document operations."""

    COLLECTION = "tasks"

    # ── Create ──────────────────────────────────────────────
    async def create_task(
        self,
        task_type: str,
        metadata: dict | None = None,
        workspace_id: str | None = None,
    ) -> str:
        task_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        record = {
            "id": task_id,
            "type": task_type,
            "status": "pending",
            "priority": metadata.get("priority", 1) if metadata else 1,
            "progress": 0,
            "message": "Initializing...",
            "error_code": None,
            "metadata": metadata or {},
            "workspace_id": workspace_id or (metadata or {}).get("workspace_id", "default"),
            "result": None,
            "created_at": now,
            "updated_at": now,
            "retry_count": 0,
            "max_retries": metadata.get("max_retries", 3) if metadata else 3,
            "next_retry_at": None,
        }
        await task_repository.create(record)
        logger.info("task_created", task_id=task_id, task_type=task_type)
        return task_id

    # ── Update ──────────────────────────────────────────────
    async def update_task(
        self,
        task_id: str,
        status: str | None = None,
        progress: int | None = None,
        message: str | None = None,
        error_code: str | None = None,
        metadata: dict | None = None,
        result: dict | None = None,
    ):
        update: dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}
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

        set_op: dict[str, Any] = {"$set": update}
        if metadata:
            for k, v in metadata.items():
                set_op["$set"][f"metadata.{k}"] = v

        await task_repository.collection.update_one({"id": task_id}, set_op)
        # We could use task_repository.update but set_op with $set.metadata.k is more specific

    # ── Read ────────────────────────────────────────────────
    async def get_task(self, task_id: str) -> Task | None:
        return await task_repository.get_by_id(task_id)

    async def list_tasks(
        self,
        task_type: str | None = None,
        workspace_id: str | None = None,
        include_completed: bool = True,
        limit: int = 50,
    ) -> list[Task]:
        query: dict[str, Any] = {}
        if task_type:
            query["type"] = task_type
        if workspace_id:
            query["workspace_id"] = workspace_id
        if not include_completed:
            query["status"] = {"$in": ["pending", "processing"]}

        cursor = task_repository.collection.find(query).sort([("priority", -1), ("created_at", -1)]).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [Task.model_validate(task_repository.normalize_id(doc)) for doc in docs]
    # note: task_repository.list_all doesn't support complex sorting/querying yet so we use collection directly

    # ── Cleanup ─────────────────────────────────────────────
    async def cleanup_old_tasks(self, older_than_hours: int = 24):
        """Remove completed/failed/canceled tasks older than the specified window."""
        cutoff = (datetime.utcnow() - timedelta(hours=older_than_hours)).isoformat()
        result = await task_repository.collection.delete_many(
            {
                "status": {"$in": ["completed", "failed", "canceled"]},
                "updated_at": {"$lt": cutoff},
            }
        )
        if result.deleted_count > 0:
            logger.info(
                "tasks_cleaned",
                deleted=result.deleted_count,
                cutoff_hours=older_than_hours,
            )

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
        return not task or getattr(task, "status", None) == "canceled"

    async def fail_with_retry(self, task_id: str, error_message: str, error_code: str):
        """Handle task failure with potential automatic retry."""
        task = await self.get_task(task_id)
        if not task:
            return

        retry_count = getattr(task, "retry_count", 0)
        max_retries = getattr(task, "max_retries", 3)

        if retry_count < max_retries:
            next_count = retry_count + 1
            # Exponential backoff: 30s, 2m, 10m
            backoff_seconds = (2**next_count) * 30
            next_retry = (datetime.utcnow() + timedelta(seconds=backoff_seconds)).isoformat()

            await self.update_task(
                task_id,
                status="pending",
                message=f"Attempt {next_count} failed: {error_message}. Retrying at {next_retry}",
                metadata={"retry_count": next_count, "next_retry_at": next_retry},
            )
            logger.info(
                "task_retry_scheduled",
                task_id=task_id,
                attempt=next_count,
                backoff=backoff_seconds,
            )
        else:
            await self.update_task(
                task_id,
                status="failed",
                error_code=error_code,
                message=f"Failed after {max_retries} retries: {error_message}",
            )
            logger.error("task_failed_permanently", task_id=task_id, error=error_message)

    # ── Resilience ──────────────────────────────────────────
    async def reset_running_tasks_on_startup(self):
        """Reset tasks stuck in 'processing' state during startup."""
        result = await task_repository.collection.update_many(
            {"status": "processing"},
            {
                "$set": {
                    "status": "failed",
                    "error_code": "SYSTEM_RESTART",
                    "message": "Task interrupted by system restart.",
                    "updated_at": datetime.utcnow().isoformat(),
                }
            },
        )
        if result.modified_count > 0:
            logger.info("tasks_reset_on_startup", count=result.modified_count)

    async def timeout_stuck_tasks(self, timeout_minutes: int = 60):
        """Fail tasks that have been processing for too long."""
        cutoff = (datetime.utcnow() - timedelta(minutes=timeout_minutes)).isoformat()

        result = await task_repository.collection.update_many(
            {"status": "processing", "updated_at": {"$lt": cutoff}},
            {
                "$set": {
                    "status": "failed",
                    "error_code": "TIMEOUT",
                    "message": f"Task timed out after {timeout_minutes} minutes.",
                    "updated_at": datetime.utcnow().isoformat(),
                }
            },
        )
        if result.modified_count > 0:
            logger.info("tasks_timed_out", count=result.modified_count, cutoff=cutoff)


task_service = TaskService()
