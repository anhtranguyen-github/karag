from fastapi import APIRouter, Request, UploadFile, File, BackgroundTasks
from backend.app.services.document_service import document_service
from backend.app.services.task_service import task_service

from backend.app.core.exceptions import ValidationError, NotFoundError

router = APIRouter(tags=["documents"])


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: str = "default"
):
    task_id, content, filename, content_type, duplicate_info = await document_service.upload(file, workspace_id)

    # Dispatch background task
    background_tasks.add_task(
        document_service.run_ingestion,
        task_id, filename, content, content_type, workspace_id
    )

    return {
        "status": "pending",
        "task_id": task_id,
        "message": "Ingestion started in background.",
        "duplicate": duplicate_info
    }


@router.post("/upload-arxiv")
async def upload_arxiv_document(
    background_tasks: BackgroundTasks,
    request: Request,
    workspace_id: str = "default"
):
    data = await request.json()
    arxiv_url = data.get("url")
    if not arxiv_url:
        raise ValidationError("arXiv URL or ID is required")

    task_id, content, filename, content_type, duplicate_info = await document_service.upload_arxiv(arxiv_url, workspace_id)

    # Dispatch background task
    background_tasks.add_task(
        document_service.run_ingestion,
        task_id, filename, content, content_type, workspace_id
    )

    return {
        "status": "pending",
        "task_id": task_id,
        "message": f"ArXiv paper '{filename}' downloading and ingestion started.",
        "duplicate": duplicate_info
    }


@router.get("/documents")
async def list_documents(workspace_id: str = "default"):
    return await document_service.list_by_workspace(workspace_id)


@router.get("/documents-all")
async def list_all_documents():
    return await document_service.list_all()


@router.get("/vault")
async def list_vault_documents():
    return await document_service.list_vault()


@router.get("/documents/{name:path}")
async def get_document(name: str):
    doc = await document_service.get_by_id_or_name(name)
    if not doc:
        raise NotFoundError(f"Document '{name}' not found")

    content = await document_service.get_content(name)
    doc["content"] = content
    return doc


@router.delete("/documents/{name:path}")
async def delete_document(name: str, workspace_id: str = "default", vault_delete: bool = False):
    await document_service.delete(name, workspace_id, vault_delete=vault_delete)
    return {"status": "success", "message": f"Document {name} deleted."}


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

    return {
        "status": "pending",
        "task_id": task_id,
        "message": f"Indexing for '{name}' started in background."
    }


@router.get("/documents/{name:path}/inspect")
async def inspect_document(name: str):
    return await document_service.inspect(name)


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

    return {
        "status": "pending",
        "task_id": task_id,
        "message": f"Document {action} operation started in background."
    }
