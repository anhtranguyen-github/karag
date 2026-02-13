import os
from typing import Dict, Any
from backend.app.services.document.ingestion.base import BaseIngestionStrategy, logger
from backend.app.services.task_service import task_service
from backend.app.core.error_codes import AppErrorCode

class DirectoryIngestionStrategy(BaseIngestionStrategy):
    @property
    def task_type(self) -> str:
        return "directory_ingestion"

    async def run(self, task_id: str, workspace_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        from backend.app.rag.ingestion import ingestion_pipeline
        path = metadata.get("path")
        
        try:
            if await task_service.is_cancelled(task_id):
                return {}
            await task_service.update_task(task_id, status="processing", progress=10, message=f"Scanning {path}...")
            
            num_chunks = await ingestion_pipeline.process_directory(path, metadata={"workspace_id": workspace_id})
            
            await task_service.update_task(
                task_id, status="completed", progress=100,
                message=f"Directory processed. Created {num_chunks} fragments.",
                result={"chunks": num_chunks}
            )
            return {"chunks": num_chunks}
        except Exception as e:
            logger.error("directory_ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(
                task_id, 
                error_message=str(e), 
                error_code=AppErrorCode.DIRECTORY_NOT_FOUND
            )
            raise e
