from typing import Dict, Any
from backend.app.services.document.ingestion.base import BaseIngestionStrategy, logger
from backend.app.services.task_service import task_service
from backend.app.core.error_codes import AppErrorCode

class SitemapIngestionStrategy(BaseIngestionStrategy):
    @property
    def task_type(self) -> str:
        return "sitemap_ingestion"

    async def run(self, task_id: str, workspace_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        from backend.app.rag.ingestion import ingestion_pipeline
        sitemap_url = metadata.get("sitemap_url")
        
        try:
            if await task_service.is_cancelled(task_id):
                return {}
            await task_service.update_task(task_id, status="processing", progress=10, message="Loading sitemap...")
            
            num_chunks = await ingestion_pipeline.process_sitemap(sitemap_url, metadata={"workspace_id": workspace_id})
            
            await task_service.update_task(
                task_id, status="completed", progress=100,
                message=f"Sitemap processed. Created {num_chunks} fragments.",
                result={"chunks": num_chunks}
            )
            return {"chunks": num_chunks}
        except Exception as e:
            logger.error("sitemap_ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(
                task_id, 
                error_message=str(e), 
                error_code=AppErrorCode.SITEMAP_FETCH_FAILED
            )
            raise e
