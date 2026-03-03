"""
API Versioning utilities.

Supports multiple versioning strategies:
1. URL path versioning (e.g., /v1/, /v2/)
2. Header versioning (e.g., Accept: application/vnd.api.v1+json)
3. Query parameter versioning (e.g., ?api-version=1.0)

Follows API design principles for versioning.
"""

from typing import Optional, Callable, Dict, Any
from enum import Enum
from functools import wraps

from fastapi import Request, HTTPException, Header, Query
from pydantic import BaseModel


class VersioningStrategy(Enum):
    """API versioning strategies."""
    URL = "url"
    HEADER = "header"
    QUERY = "query"


class ApiVersion:
    """Represents an API version."""
    
    def __init__(self, major: int, minor: int = 0, patch: int = 0):
        self.major = major
        self.minor = minor
        self.patch = patch
    
    @classmethod
    def from_string(cls, version_str: str) -> "ApiVersion":
        """Parse version from string like '1.2.3' or 'v1'."""
        version_str = version_str.lstrip("v")
        parts = version_str.split(".")
        
        major = int(parts[0])
        minor = int(parts[1]) if len(parts) > 1 else 0
        patch = int(parts[2]) if len(parts) > 2 else 0
        
        return cls(major, minor, patch)
    
    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"
    
    def __eq__(self, other) -> bool:
        if isinstance(other, ApiVersion):
            return (self.major, self.minor, self.patch) == (other.major, other.minor, other.patch)
        return False
    
    def __lt__(self, other) -> bool:
        return (self.major, self.minor, self.patch) < (other.major, other.minor, other.patch)
    
    def __le__(self, other) -> bool:
        return self == other or self < other
    
    def is_compatible_with(self, other: "ApiVersion") -> bool:
        """Check if versions are compatible (same major version)."""
        return self.major == other.major


class VersionedResponse(BaseModel):
    """Wrapper for versioned responses."""
    api_version: str
    data: Any
    deprecated: bool = False
    sunset_date: Optional[str] = None


class VersionRouter:
    """
    Router that dispatches to different handlers based on API version.
    
    Usage:
        router = VersionRouter()
        
        @router.route("/items", methods=["GET"])
        async def get_items_v1(request: Request):
            return {"items": []}
        
        @router.route("/items", methods=["GET"], version=ApiVersion(2))
        async def get_items_v2(request: Request):
            return {"data": {"items": []}}
    """
    
    def __init__(
        self,
        default_version: ApiVersion = None,
        supported_versions: list = None,
        deprecated_versions: list = None,
    ):
        self.default_version = default_version or ApiVersion(1)
        self.supported_versions = supported_versions or [ApiVersion(1)]
        self.deprecated_versions = deprecated_versions or []
        self.routes: Dict[str, Dict[ApiVersion, Callable]] = {}
    
    def route(
        self,
        path: str,
        methods: list = None,
        version: ApiVersion = None,
    ):
        """Decorator to register a versioned route handler."""
        version = version or self.default_version
        
        def decorator(func: Callable):
            key = f"{','.join(methods or ['GET'])}:{path}"
            if key not in self.routes:
                self.routes[key] = {}
            self.routes[key][version] = func
            return func
        
        return decorator
    
    def get_handler(
        self,
        method: str,
        path: str,
        version: ApiVersion,
    ) -> Optional[Callable]:
        """Get the appropriate handler for a request."""
        key = f"{method}:{path}"
        
        if key not in self.routes:
            return None
        
        version_handlers = self.routes[key]
        
        # Exact match
        if version in version_handlers:
            return version_handlers[version]
        
        # Find best compatible version (same major, highest minor/patch)
        compatible = [
            v for v in version_handlers.keys()
            if v.is_compatible_with(version) and v <= version
        ]
        
        if compatible:
            return version_handlers[max(compatible)]
        
        # Fall back to default
        return version_handlers.get(self.default_version)
    
    def is_deprecated(self, version: ApiVersion) -> bool:
        """Check if a version is deprecated."""
        return version in self.deprecated_versions


def get_api_version_from_header(
    accept: Optional[str] = Header(None),
) -> Optional[ApiVersion]:
    """
    Extract API version from Accept header.
    
    Format: Accept: application/vnd.api.v1+json
    """
    if not accept:
        return None
    
    # Parse vendor media type
    if "vnd.api." in accept:
        parts = accept.split("vnd.api.")
        if len(parts) > 1:
            version_part = parts[1].split("+")[0]  # Remove +json suffix
            try:
                return ApiVersion.from_string(version_part)
            except ValueError:
                pass
    
    return None


def get_api_version_from_query(
    api_version: Optional[str] = Query(None, alias="api-version"),
) -> Optional[ApiVersion]:
    """Extract API version from query parameter."""
    if not api_version:
        return None
    
    try:
        return ApiVersion.from_string(api_version)
    except ValueError:
        return None


def versioned(
    min_version: str = None,
    max_version: str = None,
    deprecated_in: str = None,
    removed_in: str = None,
):
    """
    Decorator to mark a handler with version constraints.
    
    Args:
        min_version: Minimum supported API version
        max_version: Maximum supported API version
        deprecated_in: Version in which this endpoint was deprecated
        removed_in: Version in which this endpoint will be removed
    """
    def decorator(func: Callable):
        func._min_version = ApiVersion.from_string(min_version) if min_version else None
        func._max_version = ApiVersion.from_string(max_version) if max_version else None
        func._deprecated_in = ApiVersion.from_string(deprecated_in) if deprecated_in else None
        func._removed_in = ApiVersion.from_string(removed_in) if removed_in else None
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Version check would happen here with request context
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def check_version_compatibility(
    request_version: ApiVersion,
    handler: Callable,
) -> Dict[str, Any]:
    """
    Check if request version is compatible with handler.
    
    Returns:
        Dict with compatibility info and warnings
    """
    result = {
        "compatible": True,
        "deprecated": False,
        "warnings": [],
    }
    
    if hasattr(handler, "_min_version") and handler._min_version:
        if request_version < handler._min_version:
            result["compatible"] = False
            result["warnings"].append(
                f"This endpoint requires API version {handler._min_version} or higher"
            )
    
    if hasattr(handler, "_max_version") and handler._max_version:
        if request_version > handler._max_version:
            result["compatible"] = False
            result["warnings"].append(
                f"This endpoint is not supported in API version {request_version}"
            )
    
    if hasattr(handler, "_deprecated_in") and handler._deprecated_in:
        if request_version >= handler._deprecated_in:
            result["deprecated"] = True
            result["warnings"].append(
                f"This endpoint is deprecated as of version {handler._deprecated_in}"
            )
    
    if hasattr(handler, "_removed_in") and handler._removed_in:
        if request_version >= handler._removed_in:
            result["compatible"] = False
            result["warnings"].append(
                f"This endpoint was removed in version {handler._removed_in}"
            )
    
    return result


# Version deprecation helper
class DeprecationSchedule:
    """Manage deprecation and sunset schedule for API versions."""
    
    def __init__(self):
        self.schedule: Dict[ApiVersion, Dict[str, Any]] = {}
    
    def deprecate(
        self,
        version: ApiVersion,
        sunset_date: str,
        migration_guide_url: str = None,
    ):
        """Mark a version as deprecated."""
        self.schedule[version] = {
            "status": "deprecated",
            "sunset_date": sunset_date,
            "migration_guide": migration_guide_url,
        }
    
    def get_deprecation_info(self, version: ApiVersion) -> Optional[Dict]:
        """Get deprecation info for a version."""
        return self.schedule.get(version)
    
    def is_sunset(self, version: ApiVersion) -> bool:
        """Check if a version has been sunset."""
        from datetime import datetime
        
        info = self.schedule.get(version)
        if not info or info["status"] != "deprecated":
            return False
        
        sunset = datetime.fromisoformat(info["sunset_date"])
        return datetime.utcnow() >= sunset
