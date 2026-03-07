from src.backend.app.api.deps import CurrentWorkspace, get_current_workspace
from src.backend.app.core.exceptions import NotFoundError, ValidationError
from src.backend.app.schemas.base import AppResponse
from src.backend.app.schemas.documents import (
    DocumentInspectionResponse,
    DocumentListItem,
    DocumentResponse,
    DocumentUploadResponse,
    DocumentWorkspaceUpdate,
    GitHubImportRequest,
    SitemapImportRequest,
    UrlImportRequest,
)
from src.backend.app.services.document_service import document_service
from src.backend.app.services.task.task_service import task_service
from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile

router = APIRouter(tags=["documents"])


@router.post("/upload", response_model=AppResponse[DocumentUploadResponse])
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
    dataset_id: str | None = None,
    strategy: str | None = None,
):
    workspace_id = current_workspace.id
    result = await document_service.upload(file, workspace_id, dataset_id=dataset_id, strategy=strategy)

    if result.status == "success":
        background_tasks.add_task(
            document_service.run_ingestion,
            result.task_id,
            result.filename,
            result.content,
            result.content_type,
            workspace_id,
            dataset_id,
        )

    return AppResponse.success_response(data=result)


@router.post("/import-url", response_model=AppResponse[DocumentUploadResponse])
async def import_url_document(
    background_tasks: BackgroundTasks,
    payload: UrlImportRequest,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    workspace_id = current_workspace.id
    url_str = str(payload.url)
    result = await document_service.import_url(url_str, workspace_id, strategy=payload.strategy)

    if result.status == "success":
        background_tasks.add_task(
            document_service.run_url_ingestion_background,
            result.task_id,
            url_str,
            result.filename,
            workspace_id,
            payload.dataset_id,
            payload.strategy,
        )

    return AppResponse.success_response(data=result)


@router.post("/import-sitemap", response_model=AppResponse[DocumentUploadResponse])
async def import_sitemap_document(
    background_tasks: BackgroundTasks,
    payload: SitemapImportRequest,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    workspace_id = current_workspace.id
    url_str = str(payload.url)
    result = await document_service.import_sitemap(url_str, workspace_id)
    if result.status == "success":
        background_tasks.add_task(
            document_service.run_sitemap_background,
            result.task_id,
            url_str,
            workspace_id,
        )
    return AppResponse.success_response(data=result)


@router.post("/import-github", response_model=AppResponse[DocumentUploadResponse])
async def import_github_document(
    background_tasks: BackgroundTasks,
    payload: GitHubImportRequest,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    workspace_id = current_workspace.id
    url_str = str(payload.url)
    result = await document_service.import_github(url_str, workspace_id, payload.branch)
    if result.status == "success":
        background_tasks.add_task(
            document_service.run_github_background,
            result.task_id,
            url_str,
            payload.branch,
            workspace_id,
        )
    return AppResponse.success_response(data=result)


@router.post("/import-audio", response_model=AppResponse[DocumentUploadResponse])
async def import_audio_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    workspace_id = current_workspace.id
    result = await document_service.import_audio(file, workspace_id)
    if result.status == "success":
        background_tasks.add_task(
            document_service.run_audio_background,
            result.task_id,
            result.filename,
            result.content,
            workspace_id,
        )

    return AppResponse.success_response(data=result)


@router.get("/documents", response_model=AppResponse[list[DocumentListItem]])
async def list_documents(current_workspace: CurrentWorkspace = Depends(get_current_workspace)):
    docs = await document_service.list_by_workspace(current_workspace.id)
    return AppResponse.success_response(data=docs)


@router.get("/documents-all", response_model=AppResponse[list[DocumentListItem]])
async def list_all_documents(current_workspace: CurrentWorkspace = Depends(get_current_workspace)):
    docs = await document_service.list_all()
    return AppResponse.success_response(data=docs)




# --- Specific Document Sub-Resources (Must come before generic {name:path}) ---


@router.get("/documents/{document_id}/chunks")
async def get_document_chunks(
    document_id: str,
    limit: int = 100,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    return await document_service.get_chunks(document_id, limit=limit)


@router.post("/documents/{document_id}/index", response_model=AppResponse[dict])
async def index_document(
    background_tasks: BackgroundTasks,
    document_id: str,
    dataset_id: str | None = None,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    workspace_id = current_workspace["id"]
    """Non-blocking indexing triggered by document ID."""
    task_id = await task_service.create_task(
        "indexing",
        {
            "doc_id": document_id,
            "workspace_id": workspace_id,
            "operation": "index",
        },
        workspace_id=workspace_id,
    )

    background_tasks.add_task(
        document_service.run_index_background, task_id, document_id, workspace_id, dataset_id, False
    )

    return AppResponse.success_response(
        data={"task_id": task_id},
        message=f"Indexing for document '{document_id}' started.",
    )


@router.get("/documents/{document_id}/inspect", response_model=AppResponse[DocumentInspectionResponse])
async def inspect_document(document_id: str, current_workspace: CurrentWorkspace = Depends(get_current_workspace)):
    results = await document_service.inspect(document_id)
    return AppResponse.success_response(data=results)


@router.post("/documents/update-workspaces", response_model=AppResponse[dict])
async def update_document_workspaces(
    background_tasks: BackgroundTasks,
    payload: DocumentWorkspaceUpdate,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    """Workspace operations using internal IDs."""
    document_id = payload.document_id
    target_workspace_id = payload.target_workspace_id
    action = payload.action
    force_reindex = payload.force_reindex

    if not document_id or not target_workspace_id:
        raise ValidationError("document_id and target_workspace_id are required")

    task_id = await task_service.create_task(
        "workspace_op",
        {
            "doc_id": document_id,
            "workspace_id": target_workspace_id,
            "operation": action,
        },
        workspace_id=target_workspace_id,
    )

    background_tasks.add_task(
        document_service.run_workspace_op_background,
        task_id,
        document_id,
        target_workspace_id,
        action,
        force_reindex,
    )

    return AppResponse.success_response(data={"task_id": task_id}, message=f"Document operation {action} started.")


@router.post("/documents/sync-workspaces", response_model=AppResponse)
async def sync_document_workspaces(
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    result = await document_service.sync_workspaces()
    return AppResponse.success_response(data=result)


# --- Generic Document Operations ---


@router.get("/documents/{document_id}", response_model=AppResponse[DocumentResponse])
async def get_document(document_id: str, current_workspace: CurrentWorkspace = Depends(get_current_workspace)):
    from src.backend.app.core.config import karag_settings
    from src.backend.app.core.minio import minio_manager

    doc = await document_service.get_by_id(document_id)
    if not doc:
        raise NotFoundError(f"Document '{document_id}' not found")

    if doc.minio_path:
        bucket_prefix = f"{karag_settings.MINIO_BUCKET}/"
        object_name = doc.minio_path
        if object_name.startswith(bucket_prefix):
            object_name = object_name[len(bucket_prefix) :]

        doc.download_url = minio_manager.get_presigned_url(object_name)

    is_binary = any(
        t in doc.content_type
        for t in [
            "image/",
            "audio/",
            "video/",
            "application/pdf",
            "application/zip",
        ]
    )

    if is_binary:
        doc.content = None
    else:
        content_bytes = await document_service.get_content(document_id)
        if content_bytes:
            try:
                doc.content = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                doc.content = None

    return AppResponse.success_response(data=doc)


@router.delete("/documents/{document_id}", response_model=AppResponse[dict])
async def delete_document(
    document_id: str,
    dataset_delete: bool = False,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    await document_service.delete(document_id, current_workspace.id, dataset_delete=dataset_delete)
    return AppResponse.success_response(
        data={"id": document_id},
        message=f"Document '{document_id}' deleted successfully.",
    )

