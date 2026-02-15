from typing import Optional
from fastapi import APIRouter, Request, UploadFile, File, BackgroundTasks
from fastapi.encoders import jsonable_encoder
from backend.app.services.document_service import document_service
from backend.app.services.task_service import task_service

from backend.app.core.exceptions import ValidationError, NotFoundError
from backend.app.schemas.base import AppResponse

router = APIRouter(tags=["documents"])


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: str = "vault",
    strategy: Optional[str] = None
):
    result = await document_service.upload(file, workspace_id, strategy=strategy)
    
    if result["status"] == "success":
        # Dispatch background task
        background_tasks.add_task(
            document_service.run_ingestion,
            result["task_id"], result["filename"], result["content"], result["content_type"], workspace_id
        )
        # Remove binary content from response to avoid UnicodeDecodeError in JSON serialization
        if "content" in result:
            del result["content"]

    return AppResponse.from_result(result)


@router.post("/upload-arxiv")
async def upload_arxiv_document(
    background_tasks: BackgroundTasks,
    request: Request,
    workspace_id: str = "vault"
):
    data = await request.json()
    arxiv_url = data.get("url")
    strategy = data.get("strategy")
    if not arxiv_url:
        return AppResponse.business_failure(
            code="MISSING_URL",
            message="arXiv URL or ID is required"
        )

    result = await document_service.upload_arxiv(arxiv_url, workspace_id, strategy=strategy)

    if result["status"] == "success":
        # Dispatch background task
        background_tasks.add_task(
            document_service.run_ingestion,
            result["task_id"], result["filename"], result["content"], result["content_type"], workspace_id
        )
        # Remove binary content from response
        if "content" in result:
            del result["content"]

    return AppResponse.from_result(result)
@router.post("/import-url")
async def import_url_document(
    background_tasks: BackgroundTasks,
    request: Request,
    workspace_id: str = "vault"
):
    data = await request.json()
    url = data.get("url")
    strategy = data.get("strategy")
    if not url:
        return AppResponse.business_failure(
            code="MISSING_URL",
            message="URL is required"
        )

    result = await document_service.import_url(url, workspace_id, strategy=strategy)

    if result["status"] == "success":
        # Dispatch background task (Phase 0: Fetch URL in background)
        background_tasks.add_task(
            document_service.run_url_ingestion_background,
            result["task_id"], url, result["filename"], workspace_id, strategy
        )
        # Remove binary content from response
        if "content" in result:
            del result["content"]

    return AppResponse.from_result(result)


@router.post("/import-sitemap")
async def import_sitemap_document(
    background_tasks: BackgroundTasks,
    request: Request,
    workspace_id: str = "vault"
):
    data = await request.json()
    url = data.get("url")
    if not url:
        return AppResponse.business_failure(code="MISSING_URL", message="Sitemap URL is required")

    result = await document_service.import_sitemap(url, workspace_id)
    if result["status"] == "success":
        background_tasks.add_task(
            document_service.run_sitemap_background,
            result["task_id"], url, workspace_id
        )
    return AppResponse.from_result(result)


@router.post("/import-directory")
async def import_directory_document(
    background_tasks: BackgroundTasks,
    request: Request,
    workspace_id: str = "vault"
):
    data = await request.json()
    path = data.get("path")
    if not path:
        return AppResponse.business_failure(code="MISSING_PATH", message="Directory path is required")

    result = await document_service.import_directory(path, workspace_id)
    if result["status"] == "success":
        background_tasks.add_task(
            document_service.run_directory_background,
            result["task_id"], path, workspace_id
        )
    return AppResponse.from_result(result)


@router.post("/import-github")
async def import_github_document(
    background_tasks: BackgroundTasks,
    request: Request,
    workspace_id: str = "vault"
):
    data = await request.json()
    url = data.get("url")
    branch = data.get("branch", "main")
    if not url:
        return AppResponse.business_failure(code="MISSING_URL", message="GitHub URL is required")

    result = await document_service.import_github(url, workspace_id, branch)
    if result["status"] == "success":
        background_tasks.add_task(
            document_service.run_github_background,
            result["task_id"], url, branch, workspace_id
        )
    return AppResponse.from_result(result)


@router.post("/import-audio")
async def import_audio_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: str = "vault"
):
    result = await document_service.import_audio(file, workspace_id)
    if result["status"] == "success":
        background_tasks.add_task(
            document_service.run_audio_background,
            result["task_id"], result["filename"], result["content"], workspace_id
        )
        # Remove binary content from response
        if "content" in result:
            del result["content"]
            
    return AppResponse.from_result(result)


@router.get("/documents")
async def list_documents(workspace_id: str = "vault"):
    docs = await document_service.list_by_workspace(workspace_id)
    return AppResponse.success_response(data=docs)


@router.get("/documents-all")
async def list_all_documents():
    docs = await document_service.list_all()
    return AppResponse.success_response(data=docs)


@router.get("/vault")
async def list_vault_documents():
    docs = await document_service.list_vault()
    return AppResponse.success_response(data=docs)

# --- Specific Document Sub-Resources (Must come before generic {name:path}) ---

@router.get("/documents/{name:path}/chunks")
async def get_document_chunks(name: str, limit: int = 100):
    return await document_service.get_chunks(name, limit=limit)


@router.post("/documents/{name:path}/index")
async def index_document(
    background_tasks: BackgroundTasks,
    name: str,
    workspace_id: str = "vault"
):
    """Non-blocking indexing: returns a task_id immediately.

    The actual embedding and vector storage runs in the background.
    Poll GET /tasks/{task_id} for progress.
    """
    task_id = await task_service.create_task("indexing", {
        "filename": name,
        "workspace_id": workspace_id,
        "operation": "index",
    }, workspace_id=workspace_id)

    background_tasks.add_task(
        document_service.run_index_background,
        task_id, name, workspace_id, False
    )

    return AppResponse.success_response(
        data={"task_id": task_id},
        message=f"Indexing for '{name}' started in background."
    )


@router.get("/documents/{name:path}/inspect")
async def inspect_document(name: str):
    results = await document_service.inspect(name)
    return AppResponse.success_response(data=results)


@router.post("/documents/update-workspaces")
async def update_document_workspaces(
    background_tasks: BackgroundTasks,
    request: Request
):
    """Non-blocking workspace operations (link, move, share).

    Returns a task_id immediately for long-running operations (link, move with reindex).
    Poll GET /tasks/{task_id} for progress.
    """
    data = await request.json()
    name = data.get("name")
    target_workspace_id = data.get("target_workspace_id")
    action = data.get("action", "share")
    force_reindex = data.get("force_reindex", False)

    if not name or not target_workspace_id:
        raise ValidationError("Name and target_workspace_id are required")



    task_id = await task_service.create_task("workspace_op", {
        "filename": name,
        "workspace_id": target_workspace_id,
        "operation": action,
    }, workspace_id=target_workspace_id)

    background_tasks.add_task(
        document_service.run_workspace_op_background,
        task_id, name, target_workspace_id, action, force_reindex
    )

    return AppResponse.success_response(
        data={"task_id": task_id},
        message=f"Document {action} operation started in background."
    )


@router.post("/documents/sync-workspaces")
async def sync_document_workspaces():
    """Manually trigger reconciliation of orphaned document-workspace links."""
    result = await document_service.sync_workspaces()
    return AppResponse.success_response(
        data=result,
        message=f"Reconciliation complete. Fixed {result['repaired_direct']} direct orphans."
    )

# --- Generic Document Operations ---

@router.get("/documents/{name:path}")
async def get_document(name: str):
    from backend.app.core.minio import minio_manager
    from backend.app.core.config import ai_settings

    doc = await document_service.get_by_id_or_name(name)
    if not doc:
        raise NotFoundError(f"Document '{name}' not found")

    # Always generate presigned URL for direct access/download
    minio_path = doc.get("minio_path")
    if minio_path:
        # Remove bucket prefix if present
        bucket_prefix = f"{ai_settings.MINIO_BUCKET}/"
        object_name = minio_path
        if object_name.startswith(bucket_prefix):
            object_name = object_name[len(bucket_prefix):]
            
        doc["download_url"] = minio_manager.get_presigned_url(object_name)

    # Determine availability of inline parsed text content
    content_type = doc.get("content_type", "application/octet-stream")
    # Treat as binary if it matches known binary types
    is_binary = any(t in content_type for t in ["image/", "audio/", "video/", "application/pdf", "application/zip", "application/octet-stream"])
    
    if is_binary:
        doc["content"] = None # Do not return binary bytes in JSON
    else:
        # Text based content: decode and return inline
        content_bytes = await document_service.get_content(name)
        if content_bytes:
            try:
                doc["content"] = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                doc["content"] = None
                doc["error"] = "Content decoding failed"

    return AppResponse.success_response(data=jsonable_encoder(doc))


@router.delete("/documents/{name:path}")
async def delete_document(name: str, workspace_id: str = "vault", vault_delete: bool = False):
    await document_service.delete(name, workspace_id, vault_delete=vault_delete)
    return AppResponse.success_response(
        data={"name": name},
        code="DOCUMENT_DELETED",
        message=f"Document '{name}' deleted successfully."
    )
