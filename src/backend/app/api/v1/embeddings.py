import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from src.backend.app.api.deps import CurrentUser, get_current_user
from src.backend.app.api.v1.completions import create_openai_error_response, parse_model_name, verify_workspace_access
from src.backend.app.core.mongodb import mongodb_manager
from src.backend.app.providers.embedding import get_embeddings
from src.backend.app.schemas.openai import (
    EmbeddingRequest,
    EmbeddingResponse,
    EmbeddingResponseData,
    EmbeddingUsage,
)

router = APIRouter(prefix="/v1", tags=["openai"])

UserDep = Annotated[CurrentUser, Depends(get_current_user)]


def _normalize_embedding_input(value: str | list[str]) -> list[str]:
    return [value] if isinstance(value, str) else value


def _estimate_tokens(texts: list[str]) -> int:
    return sum(max(1, len(text.split())) for text in texts)


async def _resolve_workspace_id(model_name: str) -> str:
    _, workspace_name, _ = parse_model_name(model_name)
    db = mongodb_manager.get_async_database()
    workspace = await db.workspaces.find_one({"$or": [{"name": workspace_name}, {"id": workspace_name}]})
    return workspace["id"] if workspace else workspace_name


@router.post("/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(request: EmbeddingRequest, user: UserDep) -> EmbeddingResponse:
    workspace_id = await _resolve_workspace_id(request.model)

    if not await verify_workspace_access(user, workspace_id):
        return create_openai_error_response(
            message=f"Workspace '{workspace_id}' not found or access denied",
            error_type="invalid_request_error",
            status_code=404,
            code="workspace_not_found",
        )

    texts = _normalize_embedding_input(request.input)
    provider = await get_embeddings(workspace_id)

    vectors = await provider.embed_documents(texts)

    return EmbeddingResponse(
        id=f"embd-{uuid.uuid4().hex}",
        model=request.model,
        data=[
            EmbeddingResponseData(
                index=index,
                embedding=vector,
            )
            for index, vector in enumerate(vectors)
        ],
        usage=EmbeddingUsage(
            prompt_tokens=_estimate_tokens(texts),
            total_tokens=_estimate_tokens(texts),
        ),
    )
