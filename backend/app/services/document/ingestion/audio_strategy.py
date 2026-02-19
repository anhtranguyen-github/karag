import os
from typing import Dict, Any
from backend.app.services.document.ingestion.base import BaseIngestionStrategy, logger
from backend.app.services.task.task_service import task_service
from backend.app.core.error_codes import AppErrorCode


class AudioIngestionStrategy(BaseIngestionStrategy):
    @property
    def task_type(self) -> str:
        return "audio_ingestion"

    async def run(
        self, task_id: str, workspace_id: str, metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        from backend.app.rag.ingestion import ingestion_pipeline

        filename = metadata.get("filename")
        content = metadata.get("content")

        tmp_path = None
        try:
            if await task_service.is_cancelled(task_id):
                return {}

            await task_service.update_task(
                task_id,
                status="processing",
                progress=10,
                message="Initializing Speech-to-Text...",
            )

            from backend.app.core.path_utils import get_safe_temp_path

            tmp_path = str(get_safe_temp_path(suffix=os.path.splitext(filename)[1]))

            with open(tmp_path, "wb") as f:
                f.write(content)

            # MOCK/PLACEHOLDER for actual STT
            await task_service.update_task(
                task_id, progress=30, message="Transcribing audio (Mock mode)..."
            )
            transcribed_text = (
                f"Sample transcription for {filename}. Audio converted to text."
            )

            await task_service.update_task(
                task_id, progress=70, message="Indexing transcribed text..."
            )

            num_chunks = await ingestion_pipeline.process_text(
                transcribed_text,
                metadata={
                    "workspace_id": workspace_id,
                    "source": filename,
                    "type": "audio_transcript",
                },
            )

            await task_service.update_task(
                task_id,
                status="completed",
                progress=100,
                message=f"Audio processed and indexed. Created {num_chunks} fragments.",
                result={"chunks": num_chunks, "filename": filename},
            )
            return {"chunks": num_chunks}
        except Exception as e:
            logger.error(
                "audio_ingestion_failed", task_id=task_id, error=str(e), exc_info=True
            )
            await task_service.fail_with_retry(
                task_id,
                error_message=str(e),
                error_code=AppErrorCode.AUDIO_PROCESSING_FAILED,
            )
            raise e
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
