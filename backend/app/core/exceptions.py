from typing import Any, Dict, Optional
from fastapi import status

class BaseAppException(Exception):
    """Base exception for all domain errors."""
    def __init__(
        self, 
        message: str, 
        code: str = "INTERNAL_ERROR", 
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        params: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.params = params
        super().__init__(self.message)

class ValidationError(BaseAppException):
    """Raised when client input fails domain rules."""
    def __init__(self, message: str, params: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            params=params
        )

class ConflictError(BaseAppException):
    """Raised when an operation conflicts with current system state (e.g. duplicates)."""
    def __init__(self, message: str, params: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="CONFLICT_ERROR",
            status_code=status.HTTP_409_CONFLICT,
            params=params
        )

class NotFoundError(BaseAppException):
    """Raised when a requested resource is missing."""
    def __init__(self, message: str, params: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            params=params
        )
