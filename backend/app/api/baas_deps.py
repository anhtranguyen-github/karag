"""
BaaS API Dependencies - Block 1: Identity & Access

Provides FastAPI dependencies for:
- API key authentication
- Workspace context injection
- Permission checking
- Rate limiting

ISOLATION: Every request resolves to exactly one workspace.
"""

from typing import Annotated, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog

from backend.app.services.api_key_service import api_key_service
from backend.app.schemas.baas import IsolationContext
from backend.app.core.exceptions import AuthenticationError

logger = structlog.get_logger(__name__)

# Security scheme for OpenAPI documentation
api_key_scheme = HTTPBearer(auto_error=False)


# Request state key for isolation context
ISOLATION_CONTEXT_KEY = "isolation_context"


async def get_api_key_from_request(
    request: Request,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(api_key_scheme)]
) -> str:
    """
    Extract API key from request.
    
    Priority:
    1. Authorization: Bearer <key> header
    2. X-API-Key header
    3. api_key query parameter (for websockets/testing)
    
    Args:
        request: FastAPI request object
        credentials: Bearer token credentials
        
    Returns:
        The API key string
        
    Raises:
        HTTPException: If no API key is found
    """
    # Priority 1: Authorization header (Bearer token)
    if credentials and credentials.credentials:
        return credentials.credentials
    
    # Priority 2: X-API-Key header
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return api_key
    
    # Priority 3: Query parameter (for websockets, testing)
    api_key = request.query_params.get("api_key")
    if api_key:
        return api_key
    
    # No key found
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "success": False,
            "code": "API_KEY_REQUIRED",
            "message": "API key is required. Provide via 'Authorization: Bearer <key>' or 'X-API-Key: <key>' header"
        }
    )


async def get_isolation_context(
    request: Request,
    api_key: Annotated[str, Depends(get_api_key_from_request)]
) -> IsolationContext:
    """
    Validate API key and extract workspace isolation context.
    
    This is the core isolation mechanism. Every authenticated request
    must resolve to exactly one workspace context.
    
    ISOLATION GUARANTEE: The returned context contains the workspace_id
    that this request is authorized to access. Cross-workspace access
    is prevented by using this context for all data queries.
    
    Args:
        request: FastAPI request object
        api_key: The API key from get_api_key_from_request
        
    Returns:
        IsolationContext with workspace_id and permissions
        
    Raises:
        HTTPException: 401 if key is invalid, expired, or revoked
    """
    try:
        context = await api_key_service.validate_key(api_key)
        
        # Store context in request state for later use
        request.state.isolation_context = context
        
        logger.debug(
            "isolation_context_extracted",
            workspace_id=context.workspace_id,
            api_key_id=context.api_key_id,
            path=request.url.path
        )
        
        return context
        
    except AuthenticationError as e:
        logger.warning(
            "api_key_validation_failed",
            error=str(e),
            path=request.url.path,
            client_ip=request.client.host if request.client else None
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "code": "INVALID_API_KEY",
                "message": str(e)
            }
        )


async def require_permission(
    permission: str,
    context: IsolationContext
) -> None:
    """
    Check if isolation context has required permission.
    
    Args:
        permission: The required permission (read, write, delete, admin)
        context: The isolation context to check
        
    Raises:
        HTTPException: 403 if permission is not granted
    """
    if not context.has_permission(permission):
        logger.warning(
            "permission_denied",
            workspace_id=context.workspace_id,
            api_key_id=context.api_key_id,
            required_permission=permission,
            granted_permissions=context.permissions
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "code": "PERMISSION_DENIED",
                "message": f"Permission '{permission}' is required for this operation",
                "required_permission": permission,
                "your_permissions": context.permissions
            }
        )


# Typed dependencies for cleaner route signatures
IsolationContextDep = Annotated[IsolationContext, Depends(get_isolation_context)]


async def get_current_workspace_id(
    context: IsolationContextDep
) -> str:
    """
    Extract workspace_id from isolation context.
    
    This is a convenience dependency for routes that only need
    the workspace_id, not the full context.
    """
    return context.workspace_id


WorkspaceIdDep = Annotated[str, Depends(get_current_workspace_id)]


async def require_read_permission(
    context: IsolationContextDep
) -> IsolationContext:
    """Dependency that requires 'read' permission."""
    await require_permission("read", context)
    return context


async def require_write_permission(
    context: IsolationContextDep
) -> IsolationContext:
    """Dependency that requires 'write' permission."""
    await require_permission("write", context)
    return context


async def require_delete_permission(
    context: IsolationContextDep
) -> IsolationContext:
    """Dependency that requires 'delete' permission."""
    await require_permission("delete", context)
    return context


async def require_admin_permission(
    context: IsolationContextDep
) -> IsolationContext:
    """Dependency that requires 'admin' permission."""
    await require_permission("admin", context)
    return context


# Permission-specific dependencies
ReadPermDep = Annotated[IsolationContext, Depends(require_read_permission)]
WritePermDep = Annotated[IsolationContext, Depends(require_write_permission)]
DeletePermDep = Annotated[IsolationContext, Depends(require_delete_permission)]
AdminPermDep = Annotated[IsolationContext, Depends(require_admin_permission)]


def get_isolation_context_from_state(request: Request) -> Optional[IsolationContext]:
    """
    Get isolation context from request state.
    
    Use this when you need the context inside service functions
    that don't have access to FastAPI dependencies.
    
    Args:
        request: The current request
        
    Returns:
        IsolationContext or None if not set
    """
    return getattr(request.state, "isolation_context", None)


# =============================================================================
# BACKWARD COMPATIBILITY
# =============================================================================

async def get_current_workspace_legacy(
    request: Request,
    context: IsolationContextDep
) -> dict:
    """
    Backward-compatible workspace getter.
    
    Returns workspace info in the legacy format for existing endpoints.
    New code should use IsolationContext directly.
    """
    from backend.app.core.mongodb import mongodb_manager
    
    db = mongodb_manager.get_async_database()
    workspace = await db.workspaces.find_one({"id": context.workspace_id})
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "code": "WORKSPACE_NOT_FOUND",
                "message": f"Workspace '{context.workspace_id}' not found"
            }
        )
    
    return {
        "id": context.workspace_id,
        "name": workspace.get("name", ""),
        "is_public": workspace.get("is_public", False),
        "permissions": context.permissions
    }


LegacyWorkspaceDep = Annotated[dict, Depends(get_current_workspace_legacy)]
