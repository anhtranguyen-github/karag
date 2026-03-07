import hashlib
import os
import uuid
from datetime import datetime

from backend.app.core.error_codes import AppErrorCode
from backend.app.core.exceptions import ValidationError
from backend.app.core.minio import minio_manager
from backend.app.repositories.document_repository import document_repository
from backend.app.schemas.documents import DocumentUploadResponse
from backend.app.services.document.base import logger, tracer
from backend.app.services.task.task_service import task_service
from fastapi import UploadFile

MAX_FILE_SIZE = 50_000_000  # 50MB
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx", ".html", ".csv", ".json"}


class DocumentUploadService:
    def _sanitize_filename(self, filename: str, max_length: int = 150) -> str:
        """Extract only the filename part (identifier) to prevent directory injection."""
        from pathlib import Path

        clean_name = Path(filename).name

        name, ext = os.path.splitext(clean_name)
        if len(clean_name) > max_length:
            return f"{name[: max_length - 10]}{ext}"
        return clean_name

    async def upload(
        self,
        file: UploadFile,
        workspace_id: str,
        dataset_id: str | None = None,
        strategy: str | None = None,
    ) -> DocumentUploadResponse:
        """Process and prepare a new document for ingestion."""
        with tracer.start_as_current_span(
            "document.upload",
            attributes={"workspace_id": workspace_id},
        ) as _:
            db = mongodb_manager.get_async_database()
            original_filename = self._sanitize_filename(file.filename or "unnamed_file")

            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise ValidationError(f"File size exceeds maximum limit of {MAX_FILE_SIZE // 1_000_000}MB")

            file_hash = hashlib.sha256(content).hexdigest()
            file_type = file.content_type

            ext = os.path.splitext(original_filename)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise ValidationError(
                    f"File extension '{ext}' is not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
                )

            existing_local_name = await document_repository.collection.find_one(
                {"workspace_id": workspace_id, "filename": original_filename}
            )
            existing_doc = await document_repository.find_by_hash(file_hash)

            conflict_type = None
            if existing_local_name and existing_doc and existing_local_name["id"] == existing_doc.id:
                conflict_type = "exact_duplicate"
            elif existing_local_name:
                conflict_type = "name_collision"
            elif existing_doc:
                conflict_type = "content_collision"

            if conflict_type and not strategy:
                suggested_name = original_filename
                if conflict_type in ["name_collision", "exact_duplicate"]:
                    name, ext = os.path.splitext(original_filename)
                    suggested_name = f"{name} (1){ext}"

                return DocumentUploadResponse(
                    status="conflict",
                    code="DUPLICATE_DETECTED",
                    message=f"Duplicate detected: {conflict_type}",
                    filename=original_filename,
                    params={
                        "type": conflict_type,
                        "filename": original_filename,
                        "suggested_name": suggested_name,
                        "existing_doc": {
                            "id": existing_doc.id if existing_doc else existing_local_name["id"],
                            "filename": existing_doc.filename
                            if existing_doc
                            else existing_local_name["filename"],
                            "workspace": existing_doc.workspace_id
                            if existing_doc
                            else existing_local_name["workspace_id"],
                        }
                        if (existing_doc or existing_local_name)
                        else None,
                    },
                )

            target_filename = original_filename
            duplicate_info = {}

            if strategy == "rename":
                name, ext = os.path.splitext(original_filename)

                # Optimized regex query to find all conflicting names
                # Properly escaping components
                import re

                cursor = db.documents.find(
                    {
                        "workspace_id": workspace_id,
                        "filename": {"$regex": f"^{re.escape(name)} \\(\\d+\\){re.escape(ext)}$"},
                    }
                )
                existing = await cursor.to_list(1000)

                max_count = 0
                for doc in existing:
                    match = re.search(r"\((\d+)\)", doc["filename"])
                    if match:
                        count = int(match.group(1))
                        if count > max_count:
                            max_count = count

                target_filename = f"{name} ({max_count + 1}){ext}"
            elif strategy == "overwrite" and existing_local_name:
                await self.delete(existing_local_name["id"], workspace_id, dataset_delete=True)

            task_type = "ingestion"
            task_id = await task_service.create_task(
                task_type,
                {
                    "filename": target_filename,
                    "workspace_id": workspace_id,
                    "dataset_id": dataset_id,
                },
                workspace_id=workspace_id,
            )

            return DocumentUploadResponse(
                status="success",
                task_id=task_id,
                filename=target_filename,
                content_type=file_type,
                duplicate_info=duplicate_info,
                content=content,
            )

    async def import_url(self, url: str, workspace_id: str, strategy: str | None = None) -> DocumentUploadResponse:
        """Fetch content from a URL and prepare for ingestion."""
        with tracer.start_as_current_span(
            "document.import_url",
            attributes={"workspace_id": workspace_id, "url": url},
        ):
            from urllib.parse import urlparse

            # Generate filename from URL for initial task creation
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                raise ValidationError("Invalid URL scheme. Only HTTP and HTTPS are supported.")

            path = parsed.path.strip("/")
            if not path:
                filename = parsed.netloc.replace(".", "_") + ".html"
            else:
                from pathlib import Path

                filename = Path(path).name
                if "." not in filename:
                    filename += ".html"

            # Note: Conflict detection based on content hash cannot happen here
            # because content is fetched in the background task.
            # Name collision detection could be added here if desired,
            # but for now, we proceed to create the task.

            task_id = await task_service.create_task(
                "url_ingestion",
                {
                    "url": url,
                    "filename": filename,  # Pass initial filename suggestion
                    "workspace_id": workspace_id,
                    "strategy": strategy,  # Pass strategy to background task
                },
                workspace_id=workspace_id,
            )

            return DocumentUploadResponse(status="success", task_id=task_id, filename=filename)

    async def import_sitemap(self, sitemap_url: str, workspace_id: str) -> DocumentUploadResponse:
        """Start a background task to process a sitemap."""
        with tracer.start_as_current_span(
            "document.import_sitemap",
            attributes={"workspace_id": workspace_id, "sitemap_url": sitemap_url},
        ):
            task_id = await task_service.create_task(
                "sitemap_ingestion",
                {"sitemap_url": sitemap_url, "workspace_id": workspace_id},
                workspace_id=workspace_id,
            )

            return DocumentUploadResponse(
                status="success",
                task_id=task_id,
                filename=sitemap_url,
                message=f"Sitemap ingestion started for {sitemap_url}",
            )

    async def run_url_ingestion_background(
        self,
        task_id: str,
        url: str,
        filename: str,
        workspace_id: str,
        dataset_id: str | None = None,
        strategy: str | None = None,
    ):
        """Background runner that fetches the URL and then ingests it."""
        from backend.app.services.document.ingestion.url_strategy import URLIngestionStrategy

        strat = URLIngestionStrategy()
        await strat.run(
            task_id,
            workspace_id,
            {"url": url, "filename": filename, "strategy": strategy, "dataset_id": dataset_id},
        )

    async def import_github(self, repo_url: str, workspace_id: str, branch: str = "main") -> DocumentUploadResponse:
        """Start a background task to process a GitHub repository."""
        with tracer.start_as_current_span(
            "document.import_github",
            attributes={
                "workspace_id": workspace_id,
                "repo_url": repo_url,
                "branch": branch,
            },
        ):
            if not repo_url.startswith(("http://", "https://", "git@")):
                return {
                    "status": "error",
                    "code": AppErrorCode.INVALID_SETTINGS,
                    "message": "Invalid repository URL.",
                }

            task_id = await task_service.create_task(
                "github_ingestion",
                {"repo_url": repo_url, "branch": branch, "workspace_id": workspace_id},
                workspace_id=workspace_id,
            )

            return DocumentUploadResponse(
                status="success",
                task_id=task_id,
                filename=repo_url,
                message=f"GitHub ingestion started for {repo_url} ({branch})",
            )

    async def run_github_background(self, task_id: str, repo_url: str, branch: str, workspace_id: str):
        """Background runner for GitHub processing."""
        from backend.app.services.document.ingestion.github_strategy import GitHubIngestionStrategy

        strat = GitHubIngestionStrategy()
        await strat.run(task_id, workspace_id, {"repo_url": repo_url, "branch": branch})

    async def run_sitemap_background(self, task_id: str, sitemap_url: str, workspace_id: str):
        """Background runner for sitemap processing."""
        from backend.app.services.document.ingestion.sitemap_strategy import (
            SitemapIngestionStrategy,
        )

        strat = SitemapIngestionStrategy()
        await strat.run(task_id, workspace_id, {"sitemap_url": sitemap_url})

    async def run_ingestion(
        self,
        task_id: str,
        filename: str,
        content: bytes,
        content_type: str,
        workspace_id: str,
        dataset_id: str | None = None,
    ):
        """Phase 1: Storage and metadata."""
        safe_filename = filename
        try:
            if await task_service.is_cancelled(task_id):
                return
            await task_service.update_task(
                task_id,
                status="processing",
                message="Uploading to document storage...",
            )

            doc_id = str(uuid.uuid4())[:8]
            file_hash = hashlib.sha256(content).hexdigest()
            extension = os.path.splitext(safe_filename)[1].lower() if safe_filename else ".tmp"
            minio_path = f"workspaces/{workspace_id}/documents/{doc_id}/v1/{safe_filename}"

            db = mongodb_manager.get_async_database()
            document_data = {
                "id": doc_id,
                "workspace_id": workspace_id,
                "filename": safe_filename,
                "extension": extension,
                "content_type": content_type,
                "size": len(content),
                "minio_path": minio_path,
                "content_hash": file_hash,
                "status": "verifying",
                "workspace_statuses": {workspace_id: "verifying"},
                "current_version": 1,
                "shared_with": [],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            await document_repository.create(document_data)

            if await task_service.is_cancelled(task_id):
                await db.documents.delete_one({"id": doc_id})
                return

            update_uploading = {"status": "uploading"}
            update_uploading[f"workspace_statuses.{workspace_id}"] = "uploading"

            await db.documents.update_one(
                {"id": doc_id},
                {"$set": update_uploading},
            )

            import io

            await minio_manager.upload_file(minio_path, io.BytesIO(content), len(content), content_type)

            if await task_service.is_cancelled(task_id):
                await db.documents.delete_one({"id": doc_id})
                minio_manager.delete_file(minio_path)
                return

            await task_service.update_task(task_id, progress=50, message="Recording metadata...")

            update_reading = {"status": "reading"}
            update_reading[f"workspace_statuses.{workspace_id}"] = "reading"

            await db.documents.update_one(
                {"id": doc_id},
                {"$set": update_reading},
            )

            # AUTO-INDEX: Proceed to Phase 2 immediately
            await task_service.update_task(task_id, progress=60, message="Indexing...")
            from backend.app.services.document.document_ingestion_service import (
                document_ingestion_service,
            )

            num_chunks = await document_ingestion_service.index_document(
                doc_id, workspace_id, dataset_id=dataset_id, task_id=task_id
            )

            await task_service.update_task(
                task_id,
                status="completed",
                progress=100,
                message=f"Ingestion complete: '{safe_filename}' indexed ({num_chunks} chunks).",
                result={
                    "doc_id": doc_id,
                    "filename": safe_filename,
                    "chunks": num_chunks,
                },
            )

            from backend.app.core.telemetry import DOCUMENT_INGESTION_COUNT

            DOCUMENT_INGESTION_COUNT.labels(extension=extension, status="success").inc()

        except Exception as e:
            logger.error("ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(task_id, error_message=str(e), error_code=AppErrorCode.INGEST_FAILED)

    async def import_audio(self, file: UploadFile, workspace_id: str) -> DocumentUploadResponse:
        """Process an audio file for speech-to-text ingestion."""
        with tracer.start_as_current_span(
            "document.import_audio",
            attributes={"workspace_id": workspace_id, "filename": file.filename},
        ):
            content = await file.read()
            filename = file.filename or "audio_file"

            task_id = await task_service.create_task(
                "audio_ingestion",
                {"filename": filename, "workspace_id": workspace_id},
                workspace_id=workspace_id,
            )

            return DocumentUploadResponse(
                status="success",
                task_id=task_id,
                filename=filename,
            )

    async def run_audio_background(self, task_id: str, filename: str, content: bytes, workspace_id: str):
        """Background runner for Audio (Speech-to-Text) processing."""
        from backend.app.services.document.ingestion.audio_strategy import AudioIngestionStrategy

        strat = AudioIngestionStrategy()
        await strat.run(task_id, workspace_id, {"filename": filename, "content": content})


document_upload_service = DocumentUploadService()
