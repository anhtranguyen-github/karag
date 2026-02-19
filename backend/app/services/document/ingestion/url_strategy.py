from typing import Dict, Any
from backend.app.services.document.ingestion.base import BaseIngestionStrategy, logger
from backend.app.services.task.task_service import task_service
from backend.app.core.error_codes import AppErrorCode

class URLIngestionStrategy(BaseIngestionStrategy):
    @property
    def task_type(self) -> str:
        return "url_ingestion"

    async def run(self, task_id: str, workspace_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        from backend.app.services.document.document_upload_service import document_upload_service
        url = metadata.get("url")
        url = metadata.get("url")
        
        try:
            if await task_service.is_cancelled(task_id):
                return {}
            await task_service.update_task(task_id, status="processing", progress=10, message=f"Fetching {url}...")
            
            import httpx
            from urllib.parse import urlparse
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
            async with httpx.AsyncClient(follow_redirects=True, headers=headers) as client:
                response = await client.get(url)
                response.raise_for_status()
                content = response.content
                content_type = response.headers.get("content-type", "text/html").split(";")[0]

            parsed = urlparse(url)
            actual_filename = parsed.path.split("/")[-1] or "index.html"
            if "." not in actual_filename:
                actual_filename += ".html"

            await document_upload_service.run_ingestion(task_id, actual_filename, content, content_type, workspace_id)
            return {"url": url}
        except Exception as e:
            logger.error("url_ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(
                task_id, 
                error_message=str(e), 
                error_code=AppErrorCode.URL_FETCH_FAILED
            )
            raise e
