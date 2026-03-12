from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response, status

from app.core.tenancy import BootstrapContext, get_bootstrap_context
from app.modules.auth.schemas import MembershipCreateRequest, MembershipUpdateRequest, ScopeMemberSummary
from app.modules.auth.service import AuthService


router = APIRouter(prefix="/memberships", tags=["memberships"])


def get_service(request: Request) -> AuthService:
    return request.app.state.karag_manager.auth_service


@router.get("", response_model=list[ScopeMemberSummary])
def list_members(
    organization_id: str = Query(...),
    project_id: str | None = Query(default=None),
    ctx: Annotated[BootstrapContext, Depends(get_bootstrap_context)] = None,
    service: Annotated[AuthService, Depends(get_service)] = None,
) -> list[ScopeMemberSummary]:
    return service.list_members(
        actor_id=ctx.actor_id,
        organization_id=organization_id,
        project_id=project_id,
    )


@router.post("", response_model=ScopeMemberSummary, status_code=status.HTTP_201_CREATED)
def create_membership(
    payload: MembershipCreateRequest,
    organization_id: str = Query(...),
    project_id: str | None = Query(default=None),
    ctx: Annotated[BootstrapContext, Depends(get_bootstrap_context)] = None,
    service: Annotated[AuthService, Depends(get_service)] = None,
) -> ScopeMemberSummary:
    return service.create_membership(
        actor_id=ctx.actor_id,
        organization_id=organization_id,
        project_id=project_id,
        user_id=payload.user_id,
        role_name=payload.role,
    )


@router.patch("/{membership_id}", response_model=ScopeMemberSummary)
def update_membership(
    membership_id: str,
    payload: MembershipUpdateRequest,
    organization_id: str = Query(...),
    project_id: str | None = Query(default=None),
    ctx: Annotated[BootstrapContext, Depends(get_bootstrap_context)] = None,
    service: Annotated[AuthService, Depends(get_service)] = None,
) -> ScopeMemberSummary:
    return service.update_membership(
        actor_id=ctx.actor_id,
        organization_id=organization_id,
        project_id=project_id,
        membership_id=membership_id,
        role_name=payload.role,
    )


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_membership(
    membership_id: str,
    organization_id: str = Query(...),
    project_id: str | None = Query(default=None),
    ctx: Annotated[BootstrapContext, Depends(get_bootstrap_context)] = None,
    service: Annotated[AuthService, Depends(get_service)] = None,
) -> Response:
    service.delete_membership(
        actor_id=ctx.actor_id,
        organization_id=organization_id,
        project_id=project_id,
        membership_id=membership_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
