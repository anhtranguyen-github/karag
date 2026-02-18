import os
import structlog
from pathlib import Path
from typing import Union
from backend.app.core.exceptions import ValidationError

logger = structlog.get_logger(__name__)

# Define the absolute root for all filesystem operations. 
# All paths handled by the system must be normalized and checked against this root.
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
SAFE_TEMP_DIR = BASE_DIR / "backend/data/temp"

# Ensure the safe temp directory exists
SAFE_TEMP_DIR.mkdir(parents=True, exist_ok=True)

def validate_safe_path(requested_path: Union[str, Path], base_dir: Union[str, Path] = BASE_DIR) -> Path:
    """
    Validates that a path is safe and strictly stays within the permitted base directory.
    This prevents directory traversal attacks and protocol injection.
    """
    try:
        # 1. Resolve everything to absolute real paths
        base_path = Path(base_dir).resolve()
        
        req_p = Path(requested_path)
        if req_p.is_absolute():
            resolved_path = req_p.resolve()
        else:
            resolved_path = (base_path / req_p).resolve()
            
        # 2. Convert to string and ensure normalization (no trailing dots or slashes)
        # We use commonpath as a secondary redundant check for 'is under root'
        try:
            # This is the primary check
            resolved_path.relative_to(base_path)
        except ValueError:
            # Secondary check: if they are identical after normalization, they are the same
            if os.path.abspath(resolved_path) == os.path.abspath(base_path):
                return resolved_path
            
            # If we reach here, it's definitely outside
            logger.error("path_validation_failed", requested=str(requested_path), resolved=str(resolved_path), base=str(base_path))
            raise ValidationError(
                f"Illegal path: Path escapes the authorized workspace root.",
                params={"requested": str(requested_path), "resolved": str(resolved_path), "allowed_root": str(base_path)}
            )
            
        return resolved_path
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error("path_validation_process_error", error=str(e), requested=str(requested_path))
        raise ValidationError(f"Invalid path validation process: {str(e)}")

def get_safe_temp_path(filename: str = None, prefix: str = None, suffix: str = None) -> Path:
    """Generate a safe temporary path within the sandboxed temp directory."""
    import uuid
    if not filename:
        name = f"{prefix or ''}{uuid.uuid4().hex}{suffix or ''}"
    else:
        name = filename
    return SAFE_TEMP_DIR / name

def is_within_root(path: Union[str, Path], root: Union[str, Path] = BASE_DIR) -> bool:
    """Helper to check if a path is within a root without raising an exception."""
    try:
        validate_safe_path(path, root)
        return True
    except ValidationError:
        return False
