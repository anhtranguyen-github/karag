import sys
import os
import json

# Add project root to sys.path
sys.path.insert(0, os.getcwd())

from backend.app.main import app
from fastapi.openapi.utils import get_openapi

def generate_openapi():
    output_path = 'frontend/src/lib/api/openapi.json'
    print(f"Exporting OpenAPI to {output_path}...")
    
    schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
    )
    
    with open(output_path, 'w') as f:
        json.dump(schema, f, indent=2)
    print("Done.")

if __name__ == "__main__":
    generate_openapi()
