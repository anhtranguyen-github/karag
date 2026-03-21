from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, Request, status

from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext, get_tenant_context
from app.modules.api_keys.schemas import ApiKeyCreate, ApiKeySummary, ApiKeyCreated
from app.modules.api_keys.repositories import ApiKeyRepository


router = APIRouter(prefix="/api-keys", tags=["api-keys"])


def get_repository(request: Request) -> ApiKeyRepository:
    karag_manager: KaragManager = request.app.state.karag_manager
    return karag_manager.api_keys


@router.post("", status_code=status.HTTP_201_CREATED)
def create_api_key(
    payload: ApiKeyCreate,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    repository: Annotated[ApiKeyRepository, Depends(get_repository)],
) -> ApiKeyCreated:
    import secrets
    key_value = f"karag_{secrets.token_urlsafe(32)}"
    
    api_key_data = ApiKeySummary(
        id=str(uuid4()),
        organization_id=payload.organization_id,
        project_id=payload.project_id,
        name=payload.name,
        is_active=True,
        created_at=datetime.now(UTC),
    )
    repository.create(api_key_data, key_value)
    
    data = api_key_data.model_dump()
    data["masked_key"] = f"{key_value[:10]}...{key_value[-4:]}"
    return ApiKeyCreated(**data, key_value=key_value)


@router.get("")
def list_api_keys(
    organization_id: str,
    project_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    repository: Annotated[ApiKeyRepository, Depends(get_repository)],
) -> list[ApiKeySummary]:
    return repository.list_for_project(organization_id, project_id)


@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_api_key(
    api_key_id: str,
    tenant: Annotated[TenantContext, Depends(get_tenant_context)],
    repository: Annotated[ApiKeyRepository, Depends(get_repository)],
):
    repository.delete(api_key_id)
    return None
