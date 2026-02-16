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

@router.get("/documents/{document_id}/chunks")
async def get_document_chunks(document_id: str, limit: int = 100):
    return await document_service.get_chunks(document_id, limit=limit)


@router.post("/documents/{document_id}/index")
async def index_document(
    background_tasks: BackgroundTasks,
    document_id: str,
    workspace_id: str = "vault"
):
    """Non-blocking indexing triggered by document ID."""
    task_id = await task_service.create_task("indexing", {
        "doc_id": document_id,
        "workspace_id": workspace_id,
        "operation": "index",
    }, workspace_id=workspace_id)

    background_tasks.add_task(
        document_service.run_index_background,
        task_id, document_id, workspace_id, False
    )

    return AppResponse.success_response(
        data={"task_id": task_id},
        message=f"Indexing for document '{document_id}' started."
    )


@router.get("/documents/{document_id}/inspect")
async def inspect_document(document_id: str):
    results = await document_service.inspect(document_id)
    return AppResponse.success_response(data=results)


@router.post("/documents/update-workspaces")
async def update_document_workspaces(
    background_tasks: BackgroundTasks,
    request: Request
):
    """Workspace operations using internal IDs."""
    data = await request.json()
    document_id = data.get("document_id")
    target_workspace_id = data.get("target_workspace_id")
    action = data.get("action", "share")
    force_reindex = data.get("force_reindex", False)

    if not document_id or not target_workspace_id:
        raise ValidationError("document_id and target_workspace_id are required")

    task_id = await task_service.create_task("workspace_op", {
        "doc_id": document_id,
        "workspace_id": target_workspace_id,
        "operation": action,
    }, workspace_id=target_workspace_id)

    background_tasks.add_task(
        document_service.run_workspace_op_background,
        task_id, document_id, target_workspace_id, action, force_reindex
    )

    return AppResponse.success_response(
        data={"task_id": task_id},
        message=f"Document operation {action} started."
    )


@router.post("/documents/sync-workspaces")
async def sync_document_workspaces():
    result = await document_service.sync_workspaces()
    return AppResponse.success_response(data=result)

# --- Generic Document Operations ---

@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    from backend.app.core.minio import minio_manager
    from backend.app.core.config import ai_settings

    doc = await document_service.get_by_id(document_id)
    if not doc:
        raise NotFoundError(f"Document '{document_id}' not found")

    minio_path = doc.get("minio_path")
    if minio_path:
        bucket_prefix = f"{ai_settings.MINIO_BUCKET}/"
        object_name = minio_path
        if object_name.startswith(bucket_prefix):
            object_name = object_name[len(bucket_prefix):]
            
        doc["download_url"] = minio_manager.get_presigned_url(object_name)

    content_type = doc.get("content_type", "application/octet-stream")
    is_binary = any(t in content_type for t in ["image/", "audio/", "video/", "application/pdf", "application/zip", "application/octet-stream"])
    
    if is_binary:
        doc["content"] = None
    else:
        content_bytes = await document_service.get_content(document_id)
        if content_bytes:
            try:
                doc["content"] = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                doc["content"] = None

    return AppResponse.success_response(data=jsonable_encoder(doc))


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, workspace_id: str = "vault", vault_delete: bool = False):
    await document_service.delete(document_id, workspace_id, vault_delete=vault_delete)
    return AppResponse.success_response(
        data={"id": document_id},
        message=f"Document '{document_id}' deleted successfully."
    )
