from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from backend.app.core.auth import create_access_token
from backend.app.services.user_service import user_service
from backend.app.schemas.users import User, UserCreate, Token
from backend.app.schemas.base import AppResponse
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AppResponse[User])
async def register(user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = await user_service.get_by_email(user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = await user_service.create(user_in)
    return AppResponse.success_response(
        data=user, message="User registered successfully"
    )


@router.post("/login", response_model=Token)
async def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = await user_service.authenticate(
        email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.get("is_active"):
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=60 * 24 * 7)
    return {
        "access_token": create_access_token(
            user["id"], expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.get("/me", response_model=User)
async def read_user_me(
    current_user: dict = Depends(get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
