import os
from pathlib import Path

import structlog
from backend.app.core.exceptions import ValidationError

logger = structlog.get_logger(__name__)

# Define the absolute root for all filesystem operations.
# All paths handled by the system must be normalized and checked against this root.
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
SAFE_TEMP_DIR = BASE_DIR / "backend/data/temp"

# Ensure the safe temp directory exists
SAFE_TEMP_DIR.mkdir(parents=True, exist_ok=True)


def validate_safe_path(requested_path: str | Path, base_dir: str | Path = BASE_DIR) -> Path:
    """
    Validates that a path is safe and strictly stays within the permitted base directory.
    This prevents directory traversal attacks and protocol injection.
    """
    try:
        # 1. Resolve everything to absolute real paths
        # We use resolve() to handle '..' and symlinks consistently
        base_path = Path(base_dir).resolve()

        req_p = Path(requested_path)
        if req_p.is_absolute():
            resolved_path = req_p.resolve()
        else:
            resolved_path = (base_path / req_p).resolve()

        # 2. Convert to string and ensure normalization
        str_resolved = str(resolved_path)
        str_base = str(base_path)

        # 3. Check containment
        try:
            # Primary check: relative_to
            resolved_path.relative_to(base_path)
        except ValueError:
            # Secondary check: Handle cases where they might be identical or have symlink nuances
            # We use commonpath as a secondary redundant check for 'is under root'
            try:
                common = os.path.commonpath([str_base, str_resolved])
                if common != str_base and os.path.normpath(str_resolved) != os.path.normpath(str_base):
                    logger.error(
                        "path_validation_failed",
                        requested=str(requested_path),
                        resolved=str_resolved,
                        base=str_base,
                    )
                    raise ValidationError(
                        f"Illegal path: {requested_path}. Path escapes the authorized workspace root: {base_path}",
                        params={
                            "requested": str(requested_path),
                            "resolved": str_resolved,
                            "allowed_root": str(base_path),
                        },
                    )
            except ValueError:  # Paths on different drives (on Windows) or something else
                logger.error(
                    "path_validation_failed_ValueError",
                    requested=str(requested_path),
                    resolved=str_resolved,
                    base=str_base,
                )
                raise ValidationError(
                    f"Illegal path: {requested_path}. Path escapes the authorized workspace root.",
                    params={
                        "requested": str(requested_path),
                        "resolved": str_resolved,
                        "allowed_root": str(base_path),
                    },
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


def is_within_root(path: str | Path, root: str | Path = BASE_DIR) -> bool:
    """Helper to check if a path is within a root without raising an exception."""
    try:
        validate_safe_path(path, root)
        return True
    except ValidationError:
        return False
