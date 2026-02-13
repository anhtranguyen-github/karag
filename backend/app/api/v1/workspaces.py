from typing import List, Optional, Literal
from fastapi import APIRouter, Request
from pydantic import BaseModel
from backend.app.services.workspace_service import workspace_service
from backend.app.core.exceptions import ValidationError, NotFoundError
from backend.app.schemas.base import AppResponse

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

class WorkspaceStats(BaseModel):
    thread_count: int = 0
    doc_count: int = 0

class Workspace(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    stats: Optional[WorkspaceStats] = None

class WorkspaceDetail(Workspace):
    threads: List[dict] = []
    documents: List[dict] = []
    settings: Optional[dict] = None

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rag_engine: Literal["basic", "graph"] = "basic"
    embedding_provider: Optional[str] = "openai"
    embedding_model: Optional[str] = "text-embedding-3-small"
    embedding_dim: Optional[int] = 1536
    chunk_size: Optional[int] = 800
    chunk_overlap: Optional[int] = 150
    neo4j_uri: Optional[str] = None
    neo4j_user: Optional[str] = None
    neo4j_password: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

@router.get("/", response_model=AppResponse[List[Workspace]])
@router.get("", response_model=AppResponse[List[Workspace]])
async def list_workspaces():
    workspaces = await workspace_service.list_all()
    return AppResponse.success_response(data=workspaces)

@router.post("/")
@router.post("")
async def create_workspace(ws: WorkspaceCreate):
    result = await workspace_service.create(ws.model_dump())
    return AppResponse.from_result(result)

@router.patch("/{workspace_id}")
async def update_workspace(workspace_id: str, ws: WorkspaceUpdate):
    update_data = {k: v for k, v in ws.model_dump().items() if v is not None}
    if not update_data:
        raise ValidationError("No data to update")
    result = await workspace_service.update(workspace_id, update_data)
    return AppResponse.success_response(data=result)

@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str, vault_delete: bool = False):
    if workspace_id == "default":
        raise ValidationError("Cannot delete default workspace")
    await workspace_service.delete(workspace_id, vault_delete=vault_delete)
    return AppResponse.success_response(data={"id": workspace_id}, message=f"Workspace {workspace_id} deleted")

@router.get("/{workspace_id}/details")
async def get_workspace_details(workspace_id: str):
    details = await workspace_service.get_details(workspace_id)
    if not details:
        raise NotFoundError(f"Workspace {workspace_id} not found")
    return AppResponse.success_response(data=details)

@router.post("/{workspace_id}/share-document")
async def share_document(workspace_id: str, request: Request):
    data = await request.json()
    source_name = data.get("source_name")
    target_workspace_id = data.get("target_workspace_id")
    
    if not source_name or not target_workspace_id:
        raise ValidationError("source_name and target_workspace_id are required")
    
    from backend.app.services.document_service import document_service
    await document_service.update_workspaces(source_name, target_workspace_id, "share")
    return AppResponse.success_response(data={"source_name": source_name, "target_workspace_id": target_workspace_id}, message=f"Document {source_name} shared with {target_workspace_id}")

@router.get("/{workspace_id}/graph")
async def get_workspace_graph(workspace_id: str):
    graph_data = await workspace_service.get_graph_data(workspace_id)
    return AppResponse.success_response(data=graph_data)
