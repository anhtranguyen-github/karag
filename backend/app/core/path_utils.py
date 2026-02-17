import os
from pathlib import Path
from typing import Union
from backend.app.core.exceptions import ValidationError

# Define the absolute root for all filesystem operations. 
# All paths handled by the system must be normalized and checked against this root.
# We resolve it to ensure we have the real absolute path without symlinks for comparison.
BASE_DIR = Path("/home/tra01/project/karag").resolve()
SAFE_TEMP_DIR = BASE_DIR / "backend/data/temp"

# Ensure the safe temp directory exists
SAFE_TEMP_DIR.mkdir(parents=True, exist_ok=True)

def validate_safe_path(requested_path: Union[str, Path], base_dir: Union[str, Path] = BASE_DIR) -> Path:
    """
    Validates that a path is safe and strictly stays within the permitted base directory.
    
    This function implements:
    - Path normalization (resolving '..', '.', and symlinks)
    - Sandbox check (ensuring the resolved path starts with the base directory)
    - Rejection of paths that attempt to escape the jail.
    
    Args:
        requested_path: The path to validate (absolute or relative).
        base_dir: The root directory that serves as the sandbox (defaults to project root).
        
    Returns:
        The resolved Path object if safe.
        
    Raises:
        ValidationError: If the path is illegal, escapes the root, or is invalid.
    """
    try:
        base_path = Path(base_dir).resolve()
        req_path = Path(requested_path)
        
        # If the path is already absolute, we just need to verify it's under base_path
        # If it's relative, we join it with base_path first.
        # .resolve() is critical here as it follows symlinks and collapses '..'
        if req_path.is_absolute():
            resolved_path = req_path.resolve()
        else:
            resolved_path = (base_path / req_path).resolve()
            
        # Security check: The resolved path MUST still start with the base_path string.
        # We use commonpath to be robust about trailing slashes and identical paths.
        try:
            # os.path.commonpath returns the longest common sub-path of each pathname in the sequence.
            # If the common path is not the base_path, then resolved_path is outside base_path.
            common = os.path.commonpath([str(base_path), str(resolved_path)])
            if common != str(base_path):
                 raise ValidationError(
                    f"Illegal path: Path escapes the authorized workspace root.",
                    params={"requested": str(requested_path), "resolved": str(resolved_path), "allowed_root": str(base_path)}
                )
        except ValueError:
            # Thrown by commonpath if paths are on different drives (Windows) or mixed formats
            raise ValidationError(
                f"Illegal path: Path is on a different volume or incompatible.",
                params={"requested": str(requested_path), "allowed_root": str(base_path)}
            )
            
        return resolved_path
        
    except ValidationError:
        raise
    except Exception as e:
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
