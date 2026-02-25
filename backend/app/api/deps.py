from fastapi import Depends, HTTPException, status, Path
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError

from backend.app.core.config import karag_settings
from backend.app.core.telemetry import workspace_id_var
from backend.app.schemas.users import TokenData
from backend.app.services.user_service import user_service
from backend.app.services.workspace_service import workspace_service

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{karag_settings.BACKEND_HOST}:{karag_settings.BACKEND_PORT}/api/v1/auth/login"
)


async def get_current_user(
    token: str = Depends(reusable_oauth2),
):
    try:
        payload = jwt.decode(
            token, karag_settings.SECRET_KEY, algorithms=[karag_settings.ALGORITHM]
        )
        token_data = TokenData(user_id=payload.get("sub"))
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = await user_service.get_by_id(token_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def get_current_workspace(
    workspace_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    if workspace_id == "vault":
        # Allow access to global vault
        return {"id": "vault", "name": "Global Vault", "owner_id": None}

    workspace = await workspace_service.get_details(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if workspace.get("owner_id") and workspace["owner_id"] != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="Not enough permissions to access this workspace"
        )
    
    # Set workspace context for telemetry
    workspace_id_var.set(workspace_id)
    
    return workspace
