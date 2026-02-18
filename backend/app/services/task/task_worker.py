import asyncio
import structlog
from datetime import datetime
from .task_service import task_service

logger = structlog.get_logger(__name__)

class TaskWorker:
    def __init__(self, poll_interval: int = 10):
        self.poll_interval = poll_interval
        self._running = False
        self._task: asyncio.Task = None

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("task_worker_started", poll_interval=self.poll_interval)

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("task_worker_stopped")

    async def _loop(self):
        while self._running:
            try:
                await self._process_pending_tasks()
                # Check for stuck processing tasks (e.g. if a worker died without updating status)
                await task_service.timeout_stuck_tasks(timeout_minutes=60)
            except Exception as e:
                logger.error("task_worker_loop_error", error=str(e), exc_info=True)
            
            await asyncio.sleep(self.poll_interval)

    async def _process_pending_tasks(self):
        # We need a new method in task_service to find ready tasks
        # For now, let's just list tasks and filter
        tasks = await task_service.list_tasks(include_completed=False, limit=10)
        
        for task in tasks:
            if task["status"] != "pending":
                continue
                
            # Check next_retry_at
            next_retry = task.get("metadata", {}).get("next_retry_at")
            if next_retry:
                next_retry_dt = datetime.fromisoformat(next_retry)
                if next_retry_dt > datetime.utcnow():
                    continue

            # Process the task
            # IMPORTANT: We need to mark it as "processing" so other workers (if any) don't pick it up
            # But here we only have one loop.
            
            await self._dispatch_task(task)

    async def _dispatch_task(self, task):
        from backend.app.services.document_service import document_service
        task_id = task["id"]
        task_type = task["type"]
        metadata = task["metadata"] or {}
        workspace_id = task["workspace_id"]
        
        logger.info("task_worker_dispatching", task_id=task_id, type=task_type)
        
        # Note: We are running this in the same loop, so it might block if not careful.
        # But our run_... methods are async and use internal await points.
        
        try:
            if task_type == "ingestion":
                # Regular ingestion requires 'content' which isn't persisted in metadata
                # So we can only recover if it's already uploaded or we have a way to get it
                pass 
            elif task_type == "url_ingestion":
                if "url" in metadata:
                    asyncio.create_task(document_service.run_url_ingestion_background(
                        task_id, metadata["url"], metadata.get("filename", "index.html"), workspace_id, metadata.get("strategy")
                    ))
            elif task_type == "sitemap_ingestion":
                if "sitemap_url" in metadata:
                    asyncio.create_task(document_service.run_sitemap_background(
                        task_id, metadata["sitemap_url"], workspace_id
                    ))
            elif task_type == "github_ingestion":
                if "repo_url" in metadata:
                    asyncio.create_task(document_service.run_github_background(
                        task_id, metadata["repo_url"], metadata.get("branch", "main"), workspace_id
                    ))
            elif task_type == "indexing":
                if "filename" in metadata:
                    asyncio.create_task(document_service.run_index_background(
                        task_id, metadata["filename"], workspace_id
                    ))
            # Audio ingestion requires content bytes which are not in metadata (persisted in MinIO usually)
            # For now, audio is a manual re-upload, but we handle the status.
        except Exception as e:
            logger.error("task_dispatch_failed", task_id=task_id, error=str(e))

task_worker = TaskWorker()
