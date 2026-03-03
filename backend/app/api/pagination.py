"""
Pagination utilities for API responses.

Implements consistent pagination following API design principles:
- Cursor-based pagination for large datasets (optimal for infinite scroll)
- Offset-based for smaller collections (simple page navigation)
- Consistent response format across all endpoints
- Proper Link header support for HATEOAS
"""

from __future__ import annotations

from typing import Any, Generic, Optional, TypeVar
from urllib.parse import urlencode

from fastapi import Query
from pydantic import BaseModel, Field, field_validator

T = TypeVar("T")


class PaginationParams:
    """
    Common pagination parameters for dependency injection.
    
    Usage:
        @router.get("/items")
        async def list_items(
            pagination: Annotated[PaginationParams, Depends()]
        ) -> AppResponse[list[Item]]:
            items = await fetch_items(offset=pagination.offset, limit=pagination.limit)
            return create_paginated_response(items, total, pagination)
    """

    def __init__(
        self,
        page: int = Query(
            1,
            ge=1,
            description="Page number (1-indexed)",
            examples=[1],
        ),
        limit: int = Query(
            20,
            ge=1,
            le=100,
            description="Items per page (max 100)",
            examples=[20],
        ),
    ):
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit


class CursorParams:
    """
    Cursor-based pagination parameters for dependency injection.
    
    Cursor pagination is optimal for:
    - Large datasets where offset becomes slow
    - Real-time data that changes frequently
    - Infinite scroll implementations
    
    Usage:
        @router.get("/items")
        async def list_items(
            cursor: Annotated[CursorParams, Depends()]
        ) -> AppResponse[list[Item]]:
            items, next_cursor = await fetch_items(
                cursor=cursor.cursor, 
                limit=cursor.limit
            )
            return create_cursor_response(items, next_cursor, cursor)
    """

    def __init__(
        self,
        cursor: Optional[str] = Query(
            None,
            description="Opaque cursor for pagination (from previous response)",
        ),
        limit: int = Query(
            20,
            ge=1,
            le=100,
            description="Items per page (max 100)",
        ),
    ):
        self.cursor = cursor
        self.limit = limit


class PageInfo(BaseModel):
    """Offset-based pagination metadata."""
    page: int = Field(..., ge=1, description="Current page number")
    limit: int = Field(..., ge=1, le=100, description="Items per page")
    total: int = Field(..., ge=0, description="Total number of items")
    total_pages: int = Field(..., ge=0, description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")

    @field_validator("total_pages")
    @classmethod
    def calculate_total_pages(cls, v: int, info) -> int:
        """Calculate total pages from total and limit if not provided."""
        data = info.data
        if "total" in data and "limit" in data:
            limit = data["limit"]
            if limit > 0:
                return (data["total"] + limit - 1) // limit
        return v


class CursorInfo(BaseModel):
    """Cursor-based pagination metadata."""
    next_cursor: Optional[str] = Field(
        None,
        description="Opaque cursor for fetching next page",
    )
    prev_cursor: Optional[str] = Field(
        None,
        description="Opaque cursor for fetching previous page",
    )
    has_more: bool = Field(
        ...,
        description="Whether there are more results available",
    )
    limit: int = Field(..., ge=1, le=100, description="Items per page")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Standard paginated response format for offset-based pagination.
    
    Example:
        {
            "data": {
                "items": [...],
                "pagination": {
                    "page": 1,
                    "limit": 20,
                    "total": 100,
                    "total_pages": 5,
                    "has_next": true,
                    "has_prev": false
                }
            },
            "success": true,
            "code": "SUCCESS"
        }
    """
    items: list[T] = Field(..., description="Items for the current page")
    pagination: PageInfo = Field(..., description="Pagination metadata")


class CursorPaginatedResponse(BaseModel, Generic[T]):
    """Cursor-based paginated response."""
    items: list[T] = Field(..., description="Items for the current page")
    pagination: CursorInfo = Field(..., description="Cursor pagination metadata")


def create_paginated_response(
    items: list[T],
    total: int,
    params: PaginationParams,
    *,
    message: str = "Data retrieved successfully",
) -> dict[str, Any]:
    """
    Create a paginated response from items and params.
    
    Args:
        items: List of items for current page
        total: Total count of all items
        params: Pagination parameters
        message: Optional success message
        
    Returns:
        Dictionary ready to be wrapped in AppResponse
        
    Example:
        >>> @router.get("/users")
        >>> async def list_users(
        ...     pagination: Annotated[PaginationParams, Depends()]
        ... ):
        ...     users = await fetch_users(
        ...         offset=pagination.offset,
        ...         limit=pagination.limit
        ...     )
        ...     total = await count_users()
        ...     return AppResponse.success_response(
        ...         data=create_paginated_response(users, total, pagination)
        ...     )
    """
    total_pages = (total + params.limit - 1) // params.limit if params.limit > 0 else 0
    
    pagination_info = PageInfo(
        page=params.page,
        limit=params.limit,
        total=total,
        total_pages=total_pages,
        has_next=params.page < total_pages,
        has_prev=params.page > 1,
    )
    
    return {
        "items": items,
        "pagination": pagination_info.model_dump(),
        "message": message,
    }


def create_cursor_response(
    items: list[T],
    next_cursor: Optional[str],
    params: CursorParams,
    *,
    prev_cursor: Optional[str] = None,
    message: str = "Data retrieved successfully",
) -> dict[str, Any]:
    """
    Create a cursor-based paginated response.
    
    Args:
        items: List of items for current page
        next_cursor: Opaque cursor for next page (None if no more items)
        params: Cursor pagination parameters
        prev_cursor: Optional cursor for previous page
        message: Optional success message
        
    Returns:
        Dictionary ready to be wrapped in AppResponse
    """
    cursor_info = CursorInfo(
        next_cursor=next_cursor,
        prev_cursor=prev_cursor,
        has_more=next_cursor is not None,
        limit=params.limit,
    )
    
    return {
        "items": items,
        "pagination": cursor_info.model_dump(),
        "message": message,
    }


def generate_link_header(
    base_url: str,
    params: PaginationParams,
    total: int,
    *,
    extra_params: Optional[dict[str, Any]] = None,
) -> Optional[str]:
    """
    Generate RFC 8288 Link header for HATEOAS pagination.
    
    Args:
        base_url: Base URL for the endpoint (without query params)
        params: Current pagination parameters
        total: Total number of items
        extra_params: Additional query parameters to preserve
        
    Returns:
        Link header string or None if pagination not applicable
        
    Example:
        >>> link_header = generate_link_header(
        ...     "/api/v1/users",
        ...     pagination,
        ...     total=100,
        ...     extra_params={"search": "john"}
        ... )
        >>> response.headers["Link"] = link_header
        # Link: </api/v1/users?page=2&limit=20&search=john>; rel="next",
        #       </api/v1/users?page=5&limit=20&search=john>; rel="last"
    """
    links: list[str] = []
    total_pages = (total + params.limit - 1) // params.limit if params.limit > 0 else 0
    
    def make_url(page: int) -> str:
        query_params: dict[str, Any] = {"page": page, "limit": params.limit}
        if extra_params:
            query_params.update(extra_params)
        return f"{base_url}?{urlencode(query_params)}"
    
    # First page
    if params.page > 1:
        links.append(f'<{make_url(1)}>; rel="first"')
        links.append(f'<{make_url(params.page - 1)}>; rel="prev"')
    
    # Next and last pages
    if params.page < total_pages:
        links.append(f'<{make_url(params.page + 1)}>; rel="next"')
        links.append(f'<{make_url(total_pages)}>; rel="last"')
    
    return ", ".join(links) if links else None


def parse_cursor(cursor: Optional[str]) -> tuple[Optional[str], Optional[int]]:
    """
    Parse a cursor string into its components.
    
    Simple implementation - can be extended for more complex cursor formats
    like base64-encoded JSON, UUIDs, timestamps, etc.
    
    Args:
        cursor: The opaque cursor string
        
    Returns:
        Tuple of (id_or_token, optional_offset)
        
    Example:
        >>> parse_cursor("user_123:50")
        ("user_123", 50)
        >>> parse_cursor(None)
        (None, None)
    """
    if not cursor:
        return None, None
    
    # Simple format: "id:offset" or just "id"
    parts = cursor.split(":")
    if len(parts) == 2:
        return parts[0], int(parts[1]) if parts[1].isdigit() else None
    return cursor, None


def encode_cursor(
    last_id: str,
    offset: Optional[int] = None,
) -> str:
    """
    Encode cursor components into a string.
    
    Args:
        last_id: The ID of the last item in the current page
        offset: Optional offset for additional positioning
        
    Returns:
        Encoded cursor string
    """
    if offset is not None:
        return f"{last_id}:{offset}"
    return last_id
