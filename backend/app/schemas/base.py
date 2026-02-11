from typing import Any, Optional, Generic, TypeVar, Dict
from pydantic import BaseModel

T = TypeVar("T")

class AppResponse(BaseModel, Generic[T]):
    success: bool = True
    code: str = "SUCCESS"
    message: str = "Operation completed successfully"
    data: Optional[T] = None

    @classmethod
    def business_failure(cls, code: str, message: str, data: Any = None):
        return cls(success=False, code=code, message=message, data=data)

    @classmethod
    def success_response(cls, data: T, message: str = "Operation completed successfully", code: str = "SUCCESS"):
        return cls(success=True, code=code, message=message, data=data)

    @classmethod
    def from_result(cls, result: Dict[str, Any]):
        """Convert a service result dict to an AppResponse."""
        if result.get("status") == "success":
            return cls.success_response(
                data=result.get("data", result), 
                message=result.get("message", "Success"),
                code=result.get("code", "SUCCESS")
            )
        return cls.business_failure(
            code=result.get("code", "ERROR"),
            message=result.get("message", "Error"),
            data=result.get("params")
        )
