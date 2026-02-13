from typing import Optional
from fastapi import APIRouter, Request, UploadFile, File, BackgroundTasks
from backend.app.services.document_service import document_service
from backend.app.services.task_service import task_service

from backend.app.core.exceptions import ValidationError, NotFoundError
from backend.app.schemas.base import AppResponse

router = APIRouter(tags=["documents"])


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: str = "default",
    strategy: Optional[str] = None
):
    result = await document_service.upload(file, workspace_id, strategy=strategy)
    
    if result["status"] == "success":
        # Dispatch background task
        background_tasks.add_task(
            document_service.run_ingestion,
            result["task_id"], result["filename"], result["content"], result["content_type"], workspace_id
        )

    return AppResponse.from_result(result)


@router.post("/upload-arxiv")
async def upload_arxiv_document(
    background_tasks: BackgroundTasks,
    request: Request,
    workspace_id: str = "default"
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

    return AppResponse.from_result(result)


@router.get("/documents")
async def list_documents(workspace_id: str = "default"):
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
    workspace_id: str = "default"
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

    # Early validation for Incompatible Workspaces (Domain Conflict)
    if not force_reindex and action in ["move", "share"]:
        from backend.app.core.settings_manager import settings_manager
        from backend.app.core.exceptions import ConflictError
        
        doc = await document_service.get_by_id_or_name(name)
        if doc and doc.get("status") == "indexed":
            target_settings = await settings_manager.get_settings(target_workspace_id)
            target_rag_hash = target_settings.get_rag_hash()
            if doc.get("rag_config_hash") != target_rag_hash:
                raise ConflictError(
                    message=f"Incompatible Workspace: Target RAG config ({target_rag_hash}) differs from Document ({doc.get('rag_config_hash')})",
                    params={"type": "rag_mismatch", "expected": doc.get("rag_config_hash"), "actual": target_rag_hash}
                )

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

# --- Generic Document Operations ---

@router.get("/documents/{name:path}")
async def get_document(name: str):
    doc = await document_service.get_by_id_or_name(name)
    if not doc:
        raise NotFoundError(f"Document '{name}' not found")

    content = await document_service.get_content(name)
    doc["content"] = content
    return AppResponse.success_response(data=doc)


@router.delete("/documents/{name:path}")
async def delete_document(name: str, workspace_id: str = "default", vault_delete: bool = False):
    await document_service.delete(name, workspace_id, vault_delete=vault_delete)
    return AppResponse.success_response(
        data={"name": name},
        code="DOCUMENT_DELETED",
        message=f"Document '{name}' deleted successfully."
    )
