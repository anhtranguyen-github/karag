
from backend.app.api.deps import (
    CurrentUser,
    CurrentWorkspace,
    get_current_user,
    get_current_workspace,
)
from backend.app.core.exceptions import NotFoundError, ValidationError
from backend.app.schemas.base import AppResponse
from backend.app.services.workspace_service import workspace_service
from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


from backend.app.schemas.workspace import (
    Workspace,
    WorkspaceCreate,
    WorkspaceDetail,
    WorkspaceUpdate,
)


@router.get("/", response_model=AppResponse[list[Workspace]])
@router.get("", response_model=AppResponse[list[Workspace]])
async def list_workspaces(current_user: CurrentUser = Depends(get_current_user)):
    workspaces = await workspace_service.list_all(current_user.id)
    return AppResponse.success_response(data=workspaces)


@router.post("/", response_model=AppResponse[Workspace])
@router.post("", response_model=AppResponse[Workspace])
async def create_workspace(ws: WorkspaceCreate, current_user: CurrentUser = Depends(get_current_user)):
    result = await workspace_service.create(ws.model_dump(), current_user.id)
    return AppResponse.success_response(data=result)


@router.patch("/{workspace_id}", response_model=AppResponse[Workspace])
async def update_workspace(
    workspace_id: str,
    ws: WorkspaceUpdate,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    update_data = {k: v for k, v in ws.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No data to update")
    result = await workspace_service.update(workspace_id, update_data)
    return AppResponse.success_response(data=result)


@router.delete("/{workspace_id}", response_model=AppResponse[dict])
async def delete_workspace(
    workspace_id: str,
    dataset_delete: bool = False,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    await workspace_service.delete(workspace_id, dataset_delete=dataset_delete)
    return AppResponse.success_response(data={"id": workspace_id}, message=f"Workspace {workspace_id} deleted")


@router.get("/{workspace_id}/details", response_model=AppResponse[WorkspaceDetail])
async def get_workspace_details(
    workspace_id: str, current_workspace: CurrentWorkspace = Depends(get_current_workspace)
):
    details = await workspace_service.get_details(workspace_id)
    if not details:
        raise NotFoundError(f"Workspace {workspace_id} not found")
    return AppResponse.success_response(data=details)


class ShareDocumentPayload(BaseModel):
    source_name: str
    target_workspace_id: str

@router.post("/{workspace_id}/share-document", response_model=AppResponse[dict])
async def share_document(
    workspace_id: str,
    payload: ShareDocumentPayload,
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    source_name = payload.source_name
    target_workspace_id = payload.target_workspace_id

    from backend.app.services.document_service import document_service

    await document_service.update_workspaces(source_name, target_workspace_id, "share")
    return AppResponse.success_response(
        data={"source_name": source_name, "target_workspace_id": target_workspace_id},
        message=f"Document {source_name} shared with {target_workspace_id}",
    )


@router.get("/{workspace_id}/graph")
async def get_workspace_graph(workspace_id: str, current_workspace: CurrentWorkspace = Depends(get_current_workspace)):
    graph_data = await workspace_service.get_graph_data(workspace_id)
    return AppResponse.success_response(data=graph_data)
