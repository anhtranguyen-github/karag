from typing import Any

from fastapi import status


class BaseAppException(Exception):
    """Base exception for all domain errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        params: dict[str, Any] | None = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.params = params
        super().__init__(self.message)


class ValidationError(BaseAppException):
    """Raised when client input fails domain rules."""

    def __init__(self, message: str, params: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            params=params,
        )


class ConflictError(BaseAppException):
    """Raised when an operation conflicts with current system state (e.g. duplicates)."""

    def __init__(self, message: str, params: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="CONFLICT_ERROR",
            status_code=status.HTTP_409_CONFLICT,
            params=params,
        )


class NotFoundError(BaseAppException):
    """Raised when a requested resource is missing."""

    def __init__(self, message: str, params: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            params=params,
        )


class AuthenticationError(BaseAppException):
    """Raised when authentication fails."""

    def __init__(
        self,
        message: str = "Authentication required",
        params: dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            status_code=status.HTTP_401_UNAUTHORIZED,
            params=params,
        )


class AuthorizationError(BaseAppException):
    """Raised when user lacks permission for an action."""

    def __init__(self, message: str = "Access denied", params: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            status_code=status.HTTP_403_FORBIDDEN,
            params=params,
        )
