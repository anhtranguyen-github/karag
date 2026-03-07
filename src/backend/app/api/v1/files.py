from datetime import datetime
from typing import Annotated

from src.backend.app.api.deps import CurrentUser, get_current_user
from src.backend.app.api.v1.completions import create_openai_error_response, verify_workspace_access
from src.backend.app.services.document_service import document_service
from src.backend.app.schemas.openai import FileObject, FilesResponse
from fastapi import APIRouter, Depends, File, Form, UploadFile

router = APIRouter(prefix="/v1", tags=["openai"])

UserDep = Annotated[CurrentUser, Depends(get_current_user)]


def _to_file_object(document, purpose: str = "assistants") -> FileObject:
    created_at = document.created_at or datetime.utcnow().isoformat()
    created_ts = int(datetime.fromisoformat(created_at.replace("Z", "+00:00")).timestamp())
    return FileObject(
        id=document.id,
        bytes=document.size or 0,
        created_at=created_ts,
        filename=document.filename,
        purpose=purpose,
        status=document.status,
    )


@router.get("/files", response_model=FilesResponse)
async def list_files(workspace_id: str, user: UserDep) -> FilesResponse:
    if not await verify_workspace_access(user, workspace_id):
        return create_openai_error_response(
            message=f"Workspace '{workspace_id}' not found or access denied",
            error_type="invalid_request_error",
            status_code=404,
            code="workspace_not_found",
        )

    documents = await document_service.list_by_workspace(workspace_id)
    return FilesResponse(data=[_to_file_object(document) for document in documents])


@router.post("/files", response_model=FileObject)
async def upload_file(
    user: UserDep,
    file: UploadFile = File(...),
    purpose: str = Form("assistants"),
    workspace_id: str = Form("default"),
) -> FileObject:
    if not await verify_workspace_access(user, workspace_id):
        return create_openai_error_response(
            message=f"Workspace '{workspace_id}' not found or access denied",
            error_type="invalid_request_error",
            status_code=404,
            code="workspace_not_found",
        )

    upload = await document_service.upload(file=file, workspace_id=workspace_id)
    return FileObject(
        id=upload.task_id or upload.filename,
        bytes=len(upload.content or b""),
        created_at=int(datetime.utcnow().timestamp()),
        filename=upload.filename,
        purpose=purpose,
        status=upload.status,
    )


@router.get("/files/{file_id}", response_model=FileObject)
async def get_file(file_id: str, workspace_id: str, user: UserDep) -> FileObject:
    if not await verify_workspace_access(user, workspace_id):
        return create_openai_error_response(
            message=f"Workspace '{workspace_id}' not found or access denied",
            error_type="invalid_request_error",
            status_code=404,
            code="workspace_not_found",
        )

    document = await document_service.get_by_id(file_id)
    if not document:
        return create_openai_error_response(
            message=f"File '{file_id}' not found",
            error_type="invalid_request_error",
            status_code=404,
            code="file_not_found",
        )

    return _to_file_object(document)


@router.delete("/files/{file_id}", response_model=FileObject)
async def delete_file(file_id: str, workspace_id: str, user: UserDep) -> FileObject:
    if not await verify_workspace_access(user, workspace_id):
        return create_openai_error_response(
            message=f"Workspace '{workspace_id}' not found or access denied",
            error_type="invalid_request_error",
            status_code=404,
            code="workspace_not_found",
        )

    document = await document_service.get_by_id(file_id)
    if not document:
        return create_openai_error_response(
            message=f"File '{file_id}' not found",
            error_type="invalid_request_error",
            status_code=404,
            code="file_not_found",
        )

    await document_service.delete(file_id, workspace_id)
    return _to_file_object(document)
