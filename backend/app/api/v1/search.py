from fastapi import APIRouter, Query, Depends
from backend.app.services.search_service import search_service

from backend.app.schemas.base import AppResponse

from backend.app.api.deps import get_current_workspace, CurrentWorkspace

router = APIRouter(tags=["search"])


@router.get("/", response_model=AppResponse)
async def global_search(
    q: str = Query(..., min_length=2, description="Search query"),
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    """
    Perform a unified search across all architectural entities.
    """
    results = await search_service.global_search(q, current_workspace.id)
    return AppResponse.success_response(data=results)


@router.get("/vector", response_model=AppResponse)
async def vector_search(
    q: str = Query(..., min_length=2, description="Search query"),
    current_workspace: CurrentWorkspace = Depends(get_current_workspace),
):
    """
    Perform a semantic search in the specific workspace using the RAG pipeline.
    """
    from backend.app.rag.rag_service import rag_service

    results = await rag_service.search(q, current_workspace.id)
    return AppResponse.success_response(data=results)
