from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.tenancy import BootstrapContext, get_bootstrap_context
from app.modules.auth.schemas import EffectivePermissionsSummary, LoginRequest, Token, UserCreate, UserSummary
from app.modules.auth.service import AuthService


router = APIRouter(prefix="/auth", tags=["auth"])


def get_service(request: Request) -> AuthService:
    return request.app.state.karag_manager.auth_service


@router.post("/register", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserCreate,
    service: Annotated[AuthService, Depends(get_service)],
) -> UserSummary:
    return service.register(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        organization_id=payload.organization_id
    )


@router.post("/login", response_model=Token)
def login(
    payload: LoginRequest,
    service: Annotated[AuthService, Depends(get_service)],
) -> Token:
    return service.login(email=payload.email, password=payload.password)


@router.get("/me", response_model=UserSummary)
def get_me(
    request: Request,
    service: Annotated[AuthService, Depends(get_service)],
) -> UserSummary:
    # This would typically use a security dependency like OAuth2PasswordBearer
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = auth_header.split(" ")[1]
    return service.get_current_user(token)


@router.get("/permissions", response_model=EffectivePermissionsSummary)
def get_effective_permissions(
    organization_id: str,
    project_id: str | None = None,
    bootstrap: Annotated[BootstrapContext, Depends(get_bootstrap_context)] = None,
    service: Annotated[AuthService, Depends(get_service)] = None,
) -> EffectivePermissionsSummary:
    return service.get_effective_permissions(
        actor_id=bootstrap.actor_id,
        organization_id=organization_id,
        project_id=project_id,
    )
