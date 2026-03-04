"""
API Dependencies for FastAPI.

Provides reusable dependencies for:
- Authentication and authorization
- Workspace context extraction
- Database session management
- Common parameter validation

Following FastAPI dependency injection best practices:
- Use Annotated types for cleaner signatures
- Cache dependencies with use_cache=True
- Handle errors gracefully
- Provide clear type hints
"""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from backend.app.core.config import karag_settings
from backend.app.core.exceptions import AuthenticationError
from backend.app.core.mongodb import mongodb_manager

# JWT configuration
JWT_SECRET_KEY = karag_settings.SECRET_KEY
JWT_ALGORITHM = karag_settings.ALGORITHM

# Security scheme for OpenAPI documentation
security_scheme = HTTPBearer(auto_error=False)


class CurrentWorkspace(BaseModel):
    """
    Workspace context extracted from request.

    This model provides a standardized way to pass workspace
    information through the dependency chain.
    """

    id: str
    name: Optional[str] = None
    is_public: bool = False


class CurrentUser(BaseModel):
    """
    Authenticated user context.

    This model provides a standardized way to pass user
    information through the dependency chain.
    """

    id: str
    email: Optional[str] = None
    is_admin: bool = False
    permissions: list[str] = []


async def get_current_workspace(
    request: Request,
    workspace_id: Annotated[
        Optional[str],
        Query(
            description="Workspace ID for workspace-scoped operations",
            examples=["ws_123abc"],
        ),
    ] = None,
) -> CurrentWorkspace:
    """
    Extract and validate workspace context from request.

    This dependency:
    1. Checks query params for workspace_id
    2. Falls back to extracting from URL path
    3. Validates workspace exists and is accessible

    Args:
        request: The incoming HTTP request
        workspace_id: Optional workspace ID from query params

    Returns:
        CurrentWorkspace with validated workspace info

    Raises:
        HTTPException: If workspace is not found or not accessible

    Example:
        @router.get("/documents")
        async def list_docs(
            workspace: Annotated[CurrentWorkspace, Depends(get_current_workspace)]
        ):
            return {"workspace_id": workspace.id}
    """
    # Priority 1: Query parameter
    if workspace_id:
        ws_id = workspace_id
    else:
        # Priority 2: Extract from URL path
        # Pattern: /api/v1/workspaces/{id}/...
        path_parts = request.url.path.strip("/").split("/")
        ws_id = None

        for i, part in enumerate(path_parts):
            if part == "workspaces" and i + 1 < len(path_parts):
                ws_id = path_parts[i + 1]
                break

    if not ws_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "code": "WORKSPACE_REQUIRED",
                "message": "Workspace ID is required",
            },
        )

    # Validate workspace exists in database
    db = mongodb_manager.get_async_database()
    workspace = await db.workspaces.find_one({"id": ws_id})

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "code": "WORKSPACE_NOT_FOUND",
                "message": f"Workspace '{ws_id}' not found",
            },
        )

    return CurrentWorkspace(
        id=ws_id,
        name=workspace.get("name"),
        is_public=workspace.get("is_public", False),
    )


async def get_optional_workspace(
    request: Request,
    workspace_id: Annotated[
        Optional[str],
        Query(None, description="Optional workspace ID"),
    ] = None,
) -> Optional[CurrentWorkspace]:
    """
    Optionally extract workspace context (may return None).

    Use this dependency when workspace is not required,
    such as for global operations or admin endpoints.

    Args:
        request: The incoming HTTP request
        workspace_id: Optional workspace ID from query params

    Returns:
        CurrentWorkspace or None if not provided
    """
    try:
        return await get_current_workspace(request, workspace_id)
    except HTTPException:
        return None


def verify_jwt_token(token: str) -> dict:
    """
    Verify and decode a JWT token.

    Args:
        token: The JWT token to verify

    Returns:
        Decoded token payload

    Raises:
        AuthenticationError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise AuthenticationError(f"Invalid or expired token: {str(e)}")


async def get_current_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials],
        Depends(security_scheme),
    ],
) -> CurrentUser:
    """
    Extract and validate current user from JWT token.

    This dependency:
    1. Extracts Bearer token from Authorization header
    2. Validates JWT signature and expiry
    3. Returns user context

    Args:
        credentials: HTTP Authorization credentials

    Returns:
        CurrentUser with validated user info

    Raises:
        HTTPException: If authentication fails

    Example:
        @router.get("/me")
        async def get_me(
            user: Annotated[CurrentUser, Depends(get_current_user)]
        ):
            return {"user_id": user.id}
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "code": "AUTHENTICATION_REQUIRED",
                "message": "Authentication required. Please provide a valid Bearer token.",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate JWT token
    token = credentials.credentials

    try:
        jwt_payload = verify_jwt_token(token)
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "code": "AUTHENTICATION_ERROR",
                "message": str(e),
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user information from token payload
    user_id = jwt_payload.get("sub") or jwt_payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "code": "INVALID_TOKEN",
                "message": "Token missing required user identifier",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(
        id=user_id,
        email=jwt_payload.get("email"),
        is_admin=jwt_payload.get("is_admin", False),
        permissions=jwt_payload.get("permissions", []),
    )


async def get_optional_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials],
        Depends(security_scheme),
    ],
) -> Optional[CurrentUser]:
    """
    Optionally extract user context (may return None).

    Use this dependency when authentication is optional,
    such as for public endpoints with optional personalization.

    Args:
        credentials: HTTP Authorization credentials

    Returns:
        CurrentUser or None if not authenticated
    """
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def require_admin(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    """
    Require admin privileges for the endpoint.

    Args:
        user: The authenticated user

    Returns:
        CurrentUser if user is admin

    Raises:
        HTTPException: If user is not an admin
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "code": "ADMIN_REQUIRED",
                "message": "Admin privileges required",
            },
        )
    return user


class PaginationParams:
    """
    Common pagination parameters.

    Usage:
        @router.get("/items")
        async def list_items(
            pagination: Annotated[PaginationParams, Depends()]
        ):
            return await fetch_items(pagination.offset, pagination.limit)
    """

    def __init__(
        self,
        page: Annotated[
            int,
            Query(
                ge=1,
                description="Page number (1-indexed)",
                examples=[1],
            ),
        ] = 1,
        limit: Annotated[
            int,
            Query(
                ge=1,
                le=100,
                description="Items per page",
                examples=[20],
            ),
        ] = 20,
    ):
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit


class SearchParams:
    """
    Common search/filter parameters.

    Usage:
        @router.get("/search")
        async def search(
            params: Annotated[SearchParams, Depends()]
        ):
            return await search_items(params.query, params.filters)
    """

    def __init__(
        self,
        q: Annotated[
            Optional[str],
            Query(
                None,
                description="Search query string",
                min_length=1,
                max_length=200,
            ),
        ] = None,
        sort: Annotated[
            Optional[str],
            Query(
                None,
                description="Sort field (prefix with - for descending)",
                examples=["created_at", "-updated_at"],
            ),
        ] = None,
        filters: Annotated[
            Optional[str],
            Query(
                None,
                description="Filter parameters as JSON string",
            ),
        ] = None,
    ):
        self.query = q
        self.sort = sort
        self.filters = filters


def get_database():
    """
    Get MongoDB database instance.

    Yields:
        MongoDB database instance

    Note:
        This is a generator for potential future use with
        connection pooling or transaction management.
    """
    db = mongodb_manager.get_async_database()
    return db


# Type aliases for cleaner route signatures
WorkspaceDep = Annotated[CurrentWorkspace, Depends(get_current_workspace)]
OptionalWorkspaceDep = Annotated[
    Optional[CurrentWorkspace], Depends(get_optional_workspace)
]
UserDep = Annotated[CurrentUser, Depends(get_current_user)]
OptionalUserDep = Annotated[Optional[CurrentUser], Depends(get_optional_user)]
AdminDep = Annotated[CurrentUser, Depends(require_admin)]
PaginationDep = Annotated[PaginationParams, Depends()]
SearchDep = Annotated[SearchParams, Depends()]
