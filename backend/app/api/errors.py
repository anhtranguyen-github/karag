"""
Enhanced API Error Handling

Following API design principles:
- Consistent error response format
- Proper HTTP status codes
- Machine-readable error codes
- Human-readable messages
- Request tracking IDs
"""

from typing import Optional, Dict, Any, List
from enum import Enum
from datetime import datetime

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

import structlog

logger = structlog.get_logger(__name__)


class ErrorSeverity(str, Enum):
    """Error severity levels."""

    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ErrorDetail(BaseModel):
    """Detailed error information."""

    field: Optional[str] = Field(None, description="Field related to error")
    message: str = Field(..., description="Human-readable error message")
    code: str = Field(..., description="Machine-readable error code")
    value: Optional[Any] = Field(None, description="Invalid value if applicable")


class ErrorResponse(BaseModel):
    """
    Standardized error response format.

    Example:
        {
            "success": false,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "severity": "warning",
                "request_id": "req-123",
                "timestamp": "2024-01-15T10:30:00Z"
            },
            "details": [
                {"field": "email", "message": "Invalid email format", "code": "INVALID_FORMAT"}
            ],
            "documentation_url": "https://api.example.com/docs/errors/VALIDATION_ERROR"
        }
    """

    success: bool = False
    error: Dict[str, Any] = Field(..., description="Main error information")
    details: Optional[List[ErrorDetail]] = Field(
        None, description="Detailed error breakdown"
    )
    documentation_url: Optional[str] = Field(
        None, description="Link to error documentation"
    )
    help: Optional[str] = Field(None, description="Helpful suggestion for resolution")


class ApiException(Exception):
    """Base API exception with structured error info."""

    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 500,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        details: List[ErrorDetail] = None,
        documentation_url: str = None,
        help_text: str = None,
        extra: Dict[str, Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.severity = severity
        self.details = details or []
        self.documentation_url = documentation_url
        self.help_text = help_text
        self.extra = extra or {}

    def to_response(self, request_id: str = None) -> ErrorResponse:
        """Convert to error response."""
        return ErrorResponse(
            error={
                "code": self.code,
                "message": self.message,
                "severity": self.severity.value,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                **self.extra,
            },
            details=self.details if self.details else None,
            documentation_url=self.documentation_url,
            help=self.help_text,
        )


# Specific exception types


class ValidationException(ApiException):
    """Request validation failed."""

    def __init__(
        self,
        message: str = "Request validation failed",
        details: List[ErrorDetail] = None,
        **kwargs,
    ):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=400,
            severity=ErrorSeverity.WARNING,
            details=details,
            help_text="Check the request parameters and try again",
            **kwargs,
        )


class AuthenticationException(ApiException):
    """Authentication required or failed."""

    def __init__(self, message: str = "Authentication required", **kwargs):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            status_code=401,
            severity=ErrorSeverity.WARNING,
            help_text="Provide valid authentication credentials",
            **kwargs,
        )


class AuthorizationException(ApiException):
    """Permission denied."""

    def __init__(self, message: str = "Permission denied", **kwargs):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            status_code=403,
            severity=ErrorSeverity.WARNING,
            help_text="Check your permissions or contact an administrator",
            **kwargs,
        )


class NotFoundException(ApiException):
    """Resource not found."""

    def __init__(
        self, resource_type: str = "Resource", resource_id: str = None, **kwargs
    ):
        message = f"{resource_type} not found"
        if resource_id:
            message = f"{resource_type} '{resource_id}' not found"

        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=404,
            severity=ErrorSeverity.WARNING,
            help_text="Verify the resource identifier and try again",
            **kwargs,
        )


class ConflictException(ApiException):
    """Resource conflict (e.g., duplicate)."""

    def __init__(self, message: str = "Resource conflict", **kwargs):
        super().__init__(
            message=message,
            code="CONFLICT",
            status_code=409,
            severity=ErrorSeverity.WARNING,
            help_text="The resource may already exist or be in an incompatible state",
            **kwargs,
        )


class RateLimitException(ApiException):
    """Rate limit exceeded."""

    def __init__(
        self, message: str = "Rate limit exceeded", retry_after: int = None, **kwargs
    ):
        extra = {}
        if retry_after:
            extra["retry_after"] = retry_after

        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            severity=ErrorSeverity.WARNING,
            help_text="Reduce request frequency or wait before retrying",
            extra=extra,
            **kwargs,
        )


class ServiceUnavailableException(ApiException):
    """Service temporarily unavailable."""

    def __init__(
        self,
        message: str = "Service temporarily unavailable",
        retry_after: int = None,
        **kwargs,
    ):
        extra = {}
        if retry_after:
            extra["retry_after"] = retry_after

        super().__init__(
            message=message,
            code="SERVICE_UNAVAILABLE",
            status_code=503,
            severity=ErrorSeverity.ERROR,
            help_text="Please try again later",
            extra=extra,
            **kwargs,
        )


class LLMProviderException(ApiException):
    """LLM provider error."""

    def __init__(
        self,
        message: str = "LLM provider error",
        provider: str = None,
        fallback_used: bool = False,
        **kwargs,
    ):
        extra = {}
        if provider:
            extra["provider"] = provider
        if fallback_used:
            extra["fallback_used"] = True

        super().__init__(
            message=message,
            code="LLM_PROVIDER_ERROR",
            status_code=502,
            severity=ErrorSeverity.ERROR,
            help_text="The AI service encountered an issue. Please retry."
            if not fallback_used
            else "Service recovered using fallback.",
            extra=extra,
            **kwargs,
        )


# Error handler middleware
class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware to catch and format exceptions."""

    def __init__(self, app, debug: bool = False):
        super().__init__(app)
        self.debug = debug

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except ApiException as exc:
            return self._handle_api_exception(exc, request)
        except HTTPException as exc:
            return self._handle_http_exception(exc, request)
        except Exception as exc:
            return self._handle_generic_exception(exc, request)

    def _handle_api_exception(
        self, exc: ApiException, request: Request
    ) -> JSONResponse:
        """Handle structured API exceptions."""
        request_id = getattr(request.state, "request_id", None)

        logger.error(
            "api_exception",
            code=exc.code,
            message=exc.message,
            status_code=exc.status_code,
            request_id=request_id,
            severity=exc.severity.value,
        )

        response = exc.to_response(request_id)
        content = response.model_dump(exclude_none=True)

        # Add debug info in development
        if self.debug:
            import traceback

            content["debug"] = {
                "exception_type": type(exc).__name__,
                "traceback": traceback.format_exc(),
            }

        headers = {}
        if exc.code == "RATE_LIMIT_EXCEEDED" and "retry_after" in exc.extra:
            headers["Retry-After"] = str(exc.extra["retry_after"])

        return JSONResponse(
            status_code=exc.status_code,
            content=content,
            headers=headers,
        )

    def _handle_http_exception(
        self, exc: HTTPException, request: Request
    ) -> JSONResponse:
        """Handle FastAPI HTTP exceptions."""
        request_id = getattr(request.state, "request_id", None)

        error_response = ErrorResponse(
            error={
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
                "severity": ErrorSeverity.WARNING.value,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=error_response.model_dump(exclude_none=True),
            headers=dict(exc.headers) if exc.headers else {},
        )

    def _handle_generic_exception(
        self, exc: Exception, request: Request
    ) -> JSONResponse:
        """Handle unexpected exceptions."""
        request_id = getattr(request.state, "request_id", None)

        logger.exception(
            "unhandled_exception",
            exception_type=type(exc).__name__,
            request_id=request_id,
        )

        error_response = ErrorResponse(
            error={
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "severity": ErrorSeverity.CRITICAL.value,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
            help="Please contact support if this error persists",
        )

        content = error_response.model_dump(exclude_none=True)

        # Add debug info in development
        if self.debug:
            import traceback

            content["debug"] = {
                "exception_type": type(exc).__name__,
                "message": str(exc),
                "traceback": traceback.format_exc(),
            }

        return JSONResponse(
            status_code=500,
            content=content,
        )


# Utility functions
def create_validation_error(
    field: str,
    message: str,
    code: str = "INVALID_VALUE",
    value: Any = None,
) -> ErrorDetail:
    """Create a validation error detail."""
    return ErrorDetail(
        field=field,
        message=message,
        code=code,
        value=value,
    )


def raise_validation_error(
    message: str,
    details: List[ErrorDetail] = None,
):
    """Helper to raise validation exception."""
    raise ValidationException(message=message, details=details)


def raise_not_found(resource_type: str, resource_id: str = None):
    """Helper to raise not found exception."""
    raise NotFoundException(resource_type=resource_type, resource_id=resource_id)
