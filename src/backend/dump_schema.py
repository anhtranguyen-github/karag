import json
import os

from src.backend.app.main import app


def dump_schema():
    schema = app.openapi()
    # Write to the specific path instead of printing
output_path = os.path.abspath("../../openapi/schema.json")
    with open(output_path, "w") as f:
        json.dump(schema, f, indent=2)

if __name__ == "__main__":
    dump_schema()

