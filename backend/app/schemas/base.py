from typing import Any, Optional, Generic, TypeVar, Dict
from pydantic import BaseModel

T = TypeVar("T")

class AppResponse(BaseModel, Generic[T]):
    success: bool = True
    code: str = "SUCCESS"
    message: str = "Operation completed successfully"
    data: Optional[T] = None

    @classmethod
    def business_failure(cls, code: str = "ERROR", message: str = "Error occurred", data: Any = None):
        return cls(success=False, code=code or "ERROR", message=message or "Error occurred", data=data)

    @classmethod
    def success_response(cls, data: T = None, message: str = "Operation completed successfully", code: str = "SUCCESS"):
        return cls(success=True, code=code or "SUCCESS", message=message or "Operation completed successfully", data=data)

    @classmethod
    def from_result(cls, result: Dict[str, Any]):
        """Convert a service result dict to an AppResponse."""
        if result.get("status") == "success":
            return cls.success_response(
                data=result.get("data") if result.get("data") is not None else result, 
                message=result.get("message") or "Success",
                code=result.get("code") or "SUCCESS"
            )
        return cls.business_failure(
            code=result.get("code") or "ERROR",
            message=result.get("message") or "Error",
            data=result.get("params")
        )
