from typing import List, Optional, Literal
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field, field_validator
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
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    stats: Optional[WorkspaceStats] = None

    # Filterable fields
    llm_provider: Optional[str] = None
    embedding_provider: Optional[str] = None
    rag_engine: Optional[str] = None


class WorkspaceDetail(Workspace):
    threads: List[dict] = []
    documents: List[dict] = []
    settings: Optional[dict] = None


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, pattern=r"^[\w\s.-]+$")
    description: Optional[str] = Field(None, max_length=200)

    # Component 1: Embedding
    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536

    # Component 2: Retrieval
    rag_engine: Literal["basic", "graph"] = "basic"
    search_limit: int = Field(5, ge=1, le=50)
    recall_k: int = Field(20, ge=1, le=100)
    hybrid_alpha: float = Field(0.5, ge=0.0, le=1.0)

    # Component 3: Graph
    graph_enabled: bool = True

    # Component 4: Reranking
    reranker_enabled: bool = False
    reranker_provider: str = "none"
    rerank_top_k: int = Field(3, ge=1, le=15)

    # Component 5: Agentic
    agentic_enabled: bool = True

    # Component 6: Generation
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o"
    temperature: float = Field(0.7, ge=0.0, le=2.0)

    # Component 7: Ingestion
    chunking_strategy: Literal[
        "recursive", "sentence", "token", "semantic", "fixed", "document"
    ] = "recursive"
    chunk_size: int = Field(800, ge=100, le=4000)
    chunk_overlap: int = Field(150, ge=0, le=1000)

    # Backend / System
    neo4j_uri: Optional[str] = None
    neo4j_user: Optional[str] = None
    neo4j_password: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty or whitespace only")
        return v.strip()


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
    await workspace_service.delete(workspace_id, vault_delete=vault_delete)
    return AppResponse.success_response(
        data={"id": workspace_id}, message=f"Workspace {workspace_id} deleted"
    )


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
    return AppResponse.success_response(
        data={"source_name": source_name, "target_workspace_id": target_workspace_id},
        message=f"Document {source_name} shared with {target_workspace_id}",
    )


@router.get("/{workspace_id}/graph")
async def get_workspace_graph(workspace_id: str):
    graph_data = await workspace_service.get_graph_data(workspace_id)
    return AppResponse.success_response(data=graph_data)
