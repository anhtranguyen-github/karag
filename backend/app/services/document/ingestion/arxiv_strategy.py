import os
import hashlib
from typing import Dict, Any
from backend.app.services.document.ingestion.base import BaseIngestionStrategy, logger
from backend.app.services.task_service import task_service
from backend.app.core.mongodb import mongodb_manager
from backend.app.core.error_codes import AppErrorCode

class ArxivIngestionStrategy(BaseIngestionStrategy):
    @property
    def task_type(self) -> str:
        return "arxiv_ingestion"

    async def run(self, task_id: str, workspace_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        from backend.app.services.document.ingestion_service import ingestion_service
        arxiv_id = metadata.get("arxiv_id")
        filename = metadata.get("filename")
        content = metadata.get("content")
        
        try:
            if await task_service.is_cancelled(task_id):
                return {}
            
            # Content should already be fetched by import_arxiv call if following original logic
            # or we could move fetching here. In original logic, it was fetched in Import.
            # We'll stick to the provided content for now.
            
            await ingestion_service.run_ingestion(task_id, filename, content, "application/pdf", workspace_id)
            return {"arxiv_id": arxiv_id}
        except Exception as e:
            logger.error("arxiv_ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(
                task_id, 
                error_message=str(e), 
                error_code=AppErrorCode.ARXIV_DOWNLOAD_FAILED
            )
            raise e
