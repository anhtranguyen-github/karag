#!/usr/bin/env python3
"""
Export OpenAPI schema from FastAPI application.

This script generates the OpenAPI schema from the FastAPI app and saves it
to the openapi/schema.json file for contract-driven development.

Usage:
    python backend/scripts/export_openapi.py

The schema is used for:
- Frontend SDK generation via Orval
- API contract validation in CI
- Documentation generation
"""

import json
import os
import sys
from pathlib import Path

# Add project root to sys.path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from fastapi.openapi.utils import get_openapi

from backend.app.main import app


def export_openapi_schema(output_path: str | None = None) -> str:
    """
    Export the FastAPI OpenAPI schema to a JSON file.
    
    Args:
        output_path: Path to write the schema to. Defaults to openapi/schema.json
        
    Returns:
        The path where the schema was written
    """
    if output_path is None:
        output_path = project_root / "openapi" / "schema.json"
    else:
        output_path = Path(output_path)
    
    # Ensure directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Exporting OpenAPI schema to {output_path}...")
    
    # Generate the OpenAPI schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
    )
    
    # Write schema to file
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)
    
    # Print schema info
    paths = list(schema.get("paths", {}).keys())
    print(f"✓ Exported OpenAPI schema v{schema.get('openapi', 'unknown')}")
    print(f"  Title: {schema.get('info', {}).get('title', 'N/A')}")
    print(f"  Version: {schema.get('info', {}).get('version', 'N/A')}")
    print(f"  Paths: {len(paths)} endpoints")
    
    return str(output_path)


if __name__ == "__main__":
    # Allow override via command line argument
    output_path = sys.argv[1] if len(sys.argv) > 1 else None
    export_openapi_schema(output_path)
