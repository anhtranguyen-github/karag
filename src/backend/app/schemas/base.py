"""
Base schemas for API responses.

Provides standardized response models following API design best practices:
- Consistent response structure across all endpoints
- Generic typing for type-safe responses
- Factory methods for common response patterns
- Proper error handling structures
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field, field_validator

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """Detailed error information for validation or processing errors."""

    field: str | None = Field(
        None,
        description="Field related to the error (if applicable)",
    )
    message: str = Field(
        ...,
        description="Human-readable error message",
    )
    code: str = Field(
        default="ERROR",
        description="Machine-readable error code",
    )


class PaginationInfo(BaseModel):
    """Pagination metadata for list responses."""

    page: int = Field(..., ge=1, description="Current page number")
    limit: int = Field(..., ge=1, le=100, description="Items per page")
    total: int = Field(..., ge=0, description="Total number of items")
    total_pages: int = Field(..., ge=0, description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")


class AppResponse(BaseModel, Generic[T]):
    """
    Standardized API response wrapper.

    All API responses follow this structure for consistency:
    {
        "success": bool,
        "code": str,
        "message": str,
        "data": T | null
    }

    Type Parameters:
        T: The type of data contained in the response

    Examples:
        >>> # Success response with data
        >>> response = AppResponse.success_response(
        ...     data={"id": 1, "name": "Test"},
        ...     message="User created successfully"
        ... )

        >>> # Error response
        >>> response = AppResponse.business_failure(
        ...     code="VALIDATION_ERROR",
        ...     message="Invalid input provided"
        ... )
    """

    success: bool = Field(
        default=True,
        description="Whether the operation was successful",
    )
    code: str = Field(
        default="SUCCESS",
        description="Machine-readable status code",
    )
    message: str = Field(
        default="Operation completed successfully",
        description="Human-readable status message",
    )
    data: T | None = Field(
        default=None,
        description="Response payload (type varies by endpoint)",
    )

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        """Ensure error codes are uppercase for consistency."""
        return v.upper()

    @classmethod
    def business_failure(
        cls,
        *,
        code: str = "ERROR",
        message: str = "Error occurred",
        data: Any | None = None,
        details: list[ErrorDetail] | None = None,
    ) -> AppResponse[Any]:
        """
        Create a failure response.

        Args:
            code: Machine-readable error code (will be uppercased)
            message: Human-readable error message
            data: Optional error details or context
            details: Optional list of detailed error information

        Returns:
            AppResponse configured for failure
        """
        return cls(
            success=False,
            code=code.upper(),
            message=message,
            data=data or details,
        )

    @classmethod
    def success_response(
        cls,
        *,
        data: T | None = None,
        message: str = "Operation completed successfully",
        code: str = "SUCCESS",
        pagination: PaginationInfo | None = None,
    ) -> AppResponse[T]:
        """
        Create a success response.

        Args:
            data: Response payload
            message: Success message
            code: Success code (will be uppercased)
            pagination: Optional pagination metadata for list responses

        Returns:
            AppResponse configured for success
        """
        # If pagination is provided, wrap data with pagination info
        if pagination is not None and data is not None:
            data = {
                "items": data,
                "pagination": pagination.model_dump(),
            }

        return cls(
            success=True,
            code=code.upper(),
            message=message,
            data=data,
        )

    @classmethod
    def from_result(cls, result: dict[str, Any]) -> AppResponse[Any]:
        """
        Convert a service result dict to an AppResponse.

        This factory method handles the common pattern where services
        return a dictionary with 'status', 'message', 'code', and 'data' keys.

        Args:
            result: Service result dictionary

        Returns:
            Properly configured AppResponse

        Example:
            >>> result = {
            ...     "status": "success",
            ...     "data": {"id": 1},
            ...     "message": "Created"
            ... }
            >>> response = AppResponse.from_result(result)
        """
        if result.get("status") == "success":
            return cls.success_response(
                data=result.get("data") if result.get("data") is not None else result,
                message=result.get("message") or "Success",
                code=result.get("code") or "SUCCESS",
            )

        return cls.business_failure(
            code=result.get("code") or "ERROR",
            message=result.get("message") or "Error",
            data=result.get("params") or result.get("data"),
        )

    @classmethod
    def paginated_response(
        cls,
        *,
        items: list[T],
        total: int,
        page: int,
        limit: int,
        message: str = "Data retrieved successfully",
    ) -> AppResponse[dict[str, Any]]:
        """
        Create a paginated response with items and pagination metadata.

        Args:
            items: List of items for the current page
            total: Total number of items across all pages
            page: Current page number (1-indexed)
            limit: Items per page
            message: Success message

        Returns:
            AppResponse with paginated data structure
        """
        total_pages = (total + limit - 1) // limit if limit > 0 else 0

        pagination = PaginationInfo(
            page=page,
            limit=limit,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )

        return cls.success_response(
            data={
                "items": items,
                "pagination": pagination.model_dump(),
            },
            message=message,
        )


class BatchOperationResult(BaseModel, Generic[T]):
    """
    Result of a batch operation (create, update, delete multiple items).

    Provides detailed information about which operations succeeded
    and which failed.
    """

    success: list[T] = Field(
        default_factory=list,
        description="Successfully processed items",
    )
    failed: list[ErrorDetail] = Field(
        default_factory=list,
        description="Failed operations with error details",
    )
    total: int = Field(
        default=0,
        description="Total number of operations attempted",
    )

    @property
    def success_count(self) -> int:
        """Number of successful operations."""
        return len(self.success)

    @property
    def failure_count(self) -> int:
        """Number of failed operations."""
        return len(self.failed)

    @property
    def all_succeeded(self) -> bool:
        """Whether all operations succeeded."""
        return self.failure_count == 0

    @property
    def all_failed(self) -> bool:
        """Whether all operations failed."""
        return self.success_count == 0

    def to_response(self) -> AppResponse[dict[str, Any]]:
        """Convert to a standard AppResponse."""
        if self.all_succeeded:
            return AppResponse.success_response(
                data={
                    "processed": self.success_count,
                    "items": self.success,
                },
                message=f"Successfully processed {self.success_count} items",
            )
        elif self.all_failed:
            return AppResponse.business_failure(
                code="BATCH_OPERATION_FAILED",
                message=f"All {self.total} operations failed",
                data={"errors": self.failed},
            )
        else:
            return AppResponse.success_response(
                data={
                    "processed": self.success_count,
                    "failed": self.failure_count,
                    "items": self.success,
                    "errors": self.failed,
                },
                message=(f"Partially successful: {self.success_count} succeeded, {self.failure_count} failed"),
                code="PARTIAL_SUCCESS",
            )
