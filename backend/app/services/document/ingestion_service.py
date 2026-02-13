import os
import hashlib
import uuid
from datetime import datetime
from typing import Dict, Optional
from fastapi import UploadFile

from backend.app.core.mongodb import mongodb_manager
from backend.app.core.minio import minio_manager
from backend.app.services.task_service import task_service
from .base import logger, tracer

class IngestionService:
    async def upload(self, file: UploadFile, workspace_id: str, strategy: Optional[str] = None) -> Dict:
        """Process and prepare a new document for ingestion."""
        with tracer.start_as_current_span(
            "document.upload",
            attributes={"workspace_id": workspace_id},
        ) as _:
            db = mongodb_manager.get_async_database()
            from backend.app.core.constants import ILLEGAL_NAME_CHARS
            original_filename = file.filename or "unnamed_file"
            found_chars = [c for c in ILLEGAL_NAME_CHARS if c in original_filename]
            if found_chars:
                return {
                    "status": "error",
                    "code": "INVALID_FILENAME",
                    "message": f"Filename contains illegal characters: {' '.join(found_chars)}. Please remove them and try again.",
                    "params": {"illegal": found_chars}
                }

            content = await file.read()
            file_hash = hashlib.sha256(content).hexdigest()
            file_type = file.content_type
            
            existing_local_name = await db.documents.find_one({"workspace_id": workspace_id, "filename": original_filename})
            existing_vault_doc = await db.documents.find_one({"content_hash": file_hash})
            
            conflict_type = None
            if existing_local_name and existing_vault_doc and existing_local_name["id"] == existing_vault_doc["id"]:
                conflict_type = "exact_duplicate"
            elif existing_local_name:
                conflict_type = "name_collision"
            elif existing_vault_doc:
                conflict_type = "content_collision"

            if conflict_type and not strategy:
                suggested_name = original_filename
                if conflict_type in ["name_collision", "exact_duplicate"]:
                    name, ext = os.path.splitext(original_filename)
                    suggested_name = f"{name} (1){ext}"
                
                return {
                    "status": "conflict",
                    "code": "DUPLICATE_DETECTED",
                    "message": f"Duplicate detected: {conflict_type}",
                    "params": {
                        "type": conflict_type,
                        "filename": original_filename,
                        "suggested_name": suggested_name,
                        "existing_doc": {
                            "id": existing_vault_doc["id"] if existing_vault_doc else existing_local_name["id"],
                            "filename": existing_vault_doc["filename"] if existing_vault_doc else existing_local_name["filename"],
                            "workspace": existing_vault_doc["workspace_id"] if existing_vault_doc else existing_local_name["workspace_id"]
                        } if (existing_vault_doc or existing_local_name) else None
                    }
                }

            target_filename = original_filename
            duplicate_info = {}

            if strategy == "rename":
                name, ext = os.path.splitext(original_filename)
                
                # Optimized regex query to find all conflicting names
                # Properly escaping components
                cursor = db.documents.find({
                    "workspace_id": workspace_id, 
                    "filename": {"$regex": f"^{re.escape(name)} \\(\\d+\\){re.escape(ext)}$"}
                })
                existing = await cursor.to_list(1000)
                
                max_count = 0
                import re
                for doc in existing:
                    match = re.search(r"\((\d+)\)", doc["filename"])
                    if match:
                        count = int(match.group(1))
                        if count > max_count:
                            max_count = count
                
                target_filename = f"{name} ({max_count + 1}){ext}"
            elif strategy == "overwrite" and existing_local_name:
                await self.delete(existing_local_name["filename"], workspace_id, vault_delete=True)

            task_id = await task_service.create_task("ingestion", {
                "filename": target_filename,
                "workspace_id": workspace_id
            }, workspace_id=workspace_id)

            return {
                "status": "success",
                "task_id": task_id,
                "content": content,
                "filename": target_filename,
                "content_type": file_type,
                "duplicate_info": duplicate_info
            }

    async def upload_arxiv(self, arxiv_id_or_url: str, workspace_id: str, strategy: Optional[str] = None) -> Dict:
        """Download from arXiv and prepare for ingestion."""
        with tracer.start_as_current_span(
            "document.upload_arxiv",
            attributes={"workspace_id": workspace_id, "arxiv_id_or_url": arxiv_id_or_url},
        ):
            import arxiv
            arxiv_id = arxiv_id_or_url.split('/')[-1]
            if arxiv_id.endswith('.pdf'):
                arxiv_id = arxiv_id[:-4]
            
            client = arxiv.Client()
            search = arxiv.Search(id_list=[arxiv_id])
            paper = next(client.results(search), None)
            if not paper:
                return {"status": "error", "code": "ARXIV_NOT_FOUND", "message": f"Paper '{arxiv_id}' not found."}

            safe_title = "".join([c if c.isalnum() or c in " .-_()" else "_" for c in paper.title])
            filename = f"{safe_title}.pdf"
            
            import httpx
            async with httpx.AsyncClient() as ac:
                res = await ac.get(paper.pdf_url)
                content = res.content

            # Validation logic mirrored from upload
            db = mongodb_manager.get_async_database()
            file_hash = hashlib.sha256(content).hexdigest()
            existing_local = await db.documents.find_one({"workspace_id": workspace_id, "filename": filename})
            existing_vault = await db.documents.find_one({"content_hash": file_hash})
            
            conflict_type = None
            if existing_local and existing_vault and existing_local["id"] == existing_vault["id"]:
                conflict_type = "exact_duplicate"
            elif existing_local:
                conflict_type = "name_collision"
            elif existing_vault:
                conflict_type = "content_collision"

            if conflict_type and not strategy:
                return {
                    "status": "conflict",
                    "code": "DUPLICATE_DETECTED",
                    "message": f"arXiv Duplicate: {conflict_type}",
                    "params": {"type": conflict_type, "filename": filename, "suggested_name": filename}
                }

            target_filename = filename
            if strategy == "rename":
                name, ext = os.path.splitext(filename)
                max_count = 0
                import re
                
                cursor = db.documents.find({
                    "workspace_id": workspace_id, 
                    "filename": {"$regex": f"^{re.escape(name)} \\(\\d+\\){re.escape(ext)}$"}
                })
                existing = await cursor.to_list(1000)
                
                for doc in existing:
                    match = re.search(r"\((\d+)\)", doc["filename"])
                    if match:
                        count = int(match.group(1))
                        if count > max_count:
                            max_count = count
                            
                target_filename = f"{name} ({max_count + 1}){ext}"

            task_id = await task_service.create_task("arxiv_ingestion", {
                "arxiv_id": arxiv_id,
                "filename": target_filename,
                "workspace_id": workspace_id
            }, workspace_id=workspace_id)

            return {
                "status": "success",
                "task_id": task_id,
                "content": content,
                "filename": target_filename,
                "content_type": "application/pdf"
            }

    async def import_url(self, url: str, workspace_id: str, strategy: Optional[str] = None) -> Dict:
        """Fetch content from a URL and prepare for ingestion."""
        with tracer.start_as_current_span(
            "document.import_url",
            attributes={"workspace_id": workspace_id, "url": url},
        ):
            from urllib.parse import urlparse
            
            # Generate filename from URL for initial task creation
            parsed = urlparse(url)
            path = parsed.path.strip("/")
            if not path:
                filename = parsed.netloc.replace(".", "_") + ".html"
            else:
                filename = path.split("/")[-1]
                if "." not in filename:
                    filename += ".html"
            
            # Note: Conflict detection based on content hash cannot happen here
            # because content is fetched in the background task.
            # Name collision detection could be added here if desired,
            # but for now, we proceed to create the task.

            task_id = await task_service.create_task("url_ingestion", {
                "url": url,
                "filename": filename, # Pass initial filename suggestion
                "workspace_id": workspace_id,
                "strategy": strategy # Pass strategy to background task
            }, workspace_id=workspace_id)

            return {
                "status": "success",
                "task_id": task_id,
                "filename": filename
            }

    async def run_url_ingestion_background(self, task_id: str, url: str, filename: str, workspace_id: str, strategy: Optional[str] = None):
        """Background runner that fetches the URL and then ingests it."""
        try:
            if await task_service.is_cancelled(task_id):
                return
            await task_service.update_task(task_id, status="processing", progress=10, message=f"Fetching {url}...")
            
            import httpx
            from urllib.parse import urlparse
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()
                content = response.content
                content_type = response.headers.get("content-type", "text/html").split(";")[0]

            # Re-generate filename if needed (though we already have it in task metadata usually)
            # This logic is for robustness, in case the initial filename was just a placeholder
            parsed = urlparse(url)
            actual_filename = parsed.path.split("/")[-1] or "index.html"
            if "." not in actual_filename: actual_filename += ".html"

            # Here, we could re-evaluate conflict based on content and strategy
            # For now, we pass it to run_ingestion which handles storage.
            # The conflict resolution logic for 'rename'/'overwrite' would need to be
            # integrated into run_ingestion or before calling it.
            # For simplicity, this example assumes run_ingestion will handle the final filename.

            await self.run_ingestion(task_id, actual_filename, content, content_type, workspace_id)
        except Exception as e:
            logger.error("url_ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(task_id, error_message=str(e), error_code="URL_IMPORT_FAILED")

    async def import_sitemap(self, sitemap_url: str, workspace_id: str) -> Dict:
        """Start a background task to process a sitemap."""
        with tracer.start_as_current_span(
            "document.import_sitemap",
            attributes={"workspace_id": workspace_id, "sitemap_url": sitemap_url},
        ):
            task_id = await task_service.create_task("sitemap_ingestion", {
                "sitemap_url": sitemap_url,
                "workspace_id": workspace_id
            }, workspace_id=workspace_id)

            return {
                "status": "success",
                "task_id": task_id,
                "message": f"Sitemap ingestion started for {sitemap_url}"
            }

    async def import_directory(self, path: str, workspace_id: str) -> Dict:
        """Start a background task to process a local directory."""
        with tracer.start_as_current_span(
            "document.import_directory",
            attributes={"workspace_id": workspace_id, "path": path},
        ):
            if not os.path.isabs(path):
                # For safety, we might want to restrict this or resolve it
                path = os.path.abspath(path)

            task_id = await task_service.create_task("directory_ingestion", {
                "path": path,
                "workspace_id": workspace_id
            }, workspace_id=workspace_id)

            return {
                "status": "success",
                "task_id": task_id,
                "message": f"Directory ingestion started for {path}"
            }

    async def run_directory_background(self, task_id: str, path: str, workspace_id: str):
        """Background runner for directory processing."""
        from backend.app.rag.ingestion import ingestion_pipeline
        try:
            if await task_service.is_cancelled(task_id):
                return
            await task_service.update_task(task_id, status="processing", progress=10, message=f"Scanning {path}...")
            
            num_chunks = await ingestion_pipeline.process_directory(path, metadata={"workspace_id": workspace_id})
            
            await task_service.update_task(
                task_id, status="completed", progress=100,
                message=f"Directory processed. Created {num_chunks} fragments.",
                result={"chunks": num_chunks}
            )
        except Exception as e:
            logger.error("directory_ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(task_id, error_message=str(e), error_code="DIRECTORY_FAILED")

    async def run_sitemap_background(self, task_id: str, sitemap_url: str, workspace_id: str):
        """Background runner for sitemap processing."""
        from backend.app.rag.ingestion import ingestion_pipeline
        try:
            if await task_service.is_cancelled(task_id):
                return
            await task_service.update_task(task_id, status="processing", progress=10, message="Loading sitemap...")
            
            # Use the pipeline to process the sitemap (chunk, embed, store)
            # Note: This version of sitemap ingestion directly indexes chunks.
            # No 'file' is saved to Minio for the sitemap itself, but indexed fragments are created.
            num_chunks = await ingestion_pipeline.process_sitemap(sitemap_url, metadata={"workspace_id": workspace_id})
            
            await task_service.update_task(
                task_id, status="completed", progress=100,
                message=f"Sitemap processed. Created {num_chunks} fragments.",
                result={"chunks": num_chunks}
            )
        except Exception as e:
            logger.error("sitemap_ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(task_id, error_message=str(e), error_code="SITEMAP_FAILED")

    async def run_ingestion(self, task_id: str, safe_filename: str, content: bytes, content_type: str, workspace_id: str):
        """Phase 1: Storage and metadata."""
        try:
            if await task_service.is_cancelled(task_id):
                return
            await task_service.update_task(task_id, status="processing", progress=10, message="Uploading to vault...")
            
            doc_id = str(uuid.uuid4())[:8]
            file_hash = hashlib.sha256(content).hexdigest()
            extension = os.path.splitext(safe_filename)[1].lower() if safe_filename else ".tmp"
            minio_path = f"workspaces/{workspace_id}/documents/{doc_id}/v1/{safe_filename}"
            
            import io
            await minio_manager.upload_file(minio_path, io.BytesIO(content), len(content), content_type)
            
            if await task_service.is_cancelled(task_id):
                minio_manager.delete_file(minio_path)
                return

            await task_service.update_task(task_id, progress=50, message="Recording metadata...")
            
            db = mongodb_manager.get_async_database()
            document_data = {
                "id": doc_id,
                "workspace_id": workspace_id,
                "filename": safe_filename,
                "extension": extension,
                "content_type": content_type,
                "minio_path": minio_path,
                "content_hash": file_hash,
                "status": "uploaded",
                "current_version": 1,
                "shared_with": [],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            await db.documents.insert_one(document_data)
            
            if await task_service.is_cancelled(task_id):
                await db.documents.delete_one({"id": doc_id})
                minio_manager.delete_file(minio_path)
                return

            await task_service.update_task(
                task_id, status="completed", progress=100,
                message=f"Document '{safe_filename}' saved to vault.",
                result={"doc_id": doc_id, "filename": safe_filename}
            )
            from backend.app.core.telemetry import DOCUMENT_INGESTION_COUNT
            DOCUMENT_INGESTION_COUNT.labels(extension=extension, status="success").inc()
            
        except Exception as e:
            logger.error("ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(task_id, error_message=str(e), error_code="INGESTION_FAILED")
    async def import_github(self, repo_url: str, workspace_id: str, branch: str = "main") -> Dict:
        """Start a background task to process a GitHub repository."""
        with tracer.start_as_current_span(
            "document.import_github",
            attributes={"workspace_id": workspace_id, "repo_url": repo_url, "branch": branch},
        ):
            # Basic validation of URL
            if not repo_url.startswith(("http://", "https://", "git@")):
                return {"status": "error", "code": "INVALID_URL", "message": "Invalid repository URL."}

            task_id = await task_service.create_task("github_ingestion", {
                "repo_url": repo_url,
                "branch": branch,
                "workspace_id": workspace_id
            }, workspace_id=workspace_id)

            return {
                "status": "success",
                "task_id": task_id,
                "message": f"GitHub ingestion started for {repo_url} ({branch})"
            }

    async def run_github_background(self, task_id: str, repo_url: str, branch: str, workspace_id: str):
        """Background runner for GitHub processing."""
        from backend.app.rag.ingestion import ingestion_pipeline
        import tempfile
        import shutil
        import subprocess
        
        tmp_dir = tempfile.mkdtemp(prefix="karag_git_")
        try:
            if await task_service.is_cancelled(task_id):
                return
                
            await task_service.update_task(task_id, status="processing", progress=5, message=f"Cloning {repo_url}...")
            
            # Clone repo
            # --depth 1 for shallow clone
            result = subprocess.run(
                ["git", "clone", "--depth", "1", "--branch", branch, repo_url, tmp_dir],
                capture_output=True, text=True, check=False
            )
            
            if result.returncode != 0:
                # Fallback if branch name is wrong (e.g. master vs main)
                if "Remote branch" in result.stderr and branch == "main":
                    await task_service.update_task(task_id, message="Main branch not found, trying master...")
                    result = subprocess.run(
                        ["git", "clone", "--depth", "1", "--branch", "master", repo_url, tmp_dir],
                        capture_output=True, text=True, check=False
                    )

            if result.returncode != 0:
                raise Exception(f"Git clone failed: {result.stderr}")

            await task_service.update_task(task_id, progress=20, message="Processing repository files...")
            
            # Use directory ingestion logic on the cloned repo
            num_chunks = await ingestion_pipeline.process_directory(tmp_dir, metadata={"workspace_id": workspace_id, "source": f"github:{repo_url}"})
            
            await task_service.update_task(
                task_id, status="completed", progress=100,
                message=f"GitHub repository processed. Created {num_chunks} fragments.",
                result={"chunks": num_chunks, "repo": repo_url}
            )
        except Exception as e:
            logger.error("github_ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(task_id, error_message=str(e), error_code="GITHUB_FAILED")
        finally:
            if os.path.exists(tmp_dir):
                shutil.rmtree(tmp_dir)
    async def import_audio(self, file: UploadFile, workspace_id: str) -> Dict:
        """Process an audio file for speech-to-text ingestion."""
        with tracer.start_as_current_span(
            "document.import_audio",
            attributes={"workspace_id": workspace_id, "filename": file.filename},
        ):
            content = await file.read()
            filename = file.filename or "audio_file"
            
            task_id = await task_service.create_task("audio_ingestion", {
                "filename": filename,
                "workspace_id": workspace_id
            }, workspace_id=workspace_id)

            return {
                "status": "success",
                "task_id": task_id,
                "content": content,
                "filename": filename
            }

    async def run_audio_background(self, task_id: str, filename: str, content: bytes, workspace_id: str):
        """Background runner for Audio (Speech-to-Text) processing."""
        from backend.app.rag.ingestion import ingestion_pipeline
        import tempfile
        
        tmp_path = None
        try:
            if await task_service.is_cancelled(task_id):
                return
                
            await task_service.update_task(task_id, status="processing", progress=10, message="Initializing Speech-to-Text...")
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            # MOCK/PLACEHOLDER for actual Whisper/STT logic
            # In a full implementation, you'd use openai-whisper or an API here.
            await task_service.update_task(task_id, progress=30, message="Transcribing audio (Mock mode)...")
            
            # Simulated transcription result
            transcribed_text = f"Sample transcription for {filename}. This is where the audio content would be converted to text."
            
            await task_service.update_task(task_id, progress=70, message="Indexing transcribed text...")
            
            # Now ingest the text as if it was a text file
            num_chunks = await ingestion_pipeline.process_text(
                transcribed_text, 
                metadata={
                    "workspace_id": workspace_id, 
                    "source": filename,
                    "type": "audio_transcript"
                }
            )
            
            await task_service.update_task(
                task_id, status="completed", progress=100,
                message=f"Audio processed and indexed. Created {num_chunks} fragments.",
                result={"chunks": num_chunks, "filename": filename}
            )
        except Exception as e:
            logger.error("audio_ingestion_failed", task_id=task_id, error=str(e), exc_info=True)
            await task_service.fail_with_retry(task_id, error_message=str(e), error_code="AUDIO_FAILED")
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
