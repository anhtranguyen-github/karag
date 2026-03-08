from __future__ import annotations

import re


def resolve_collection_name(base_name: str, embedding_model: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", embedding_model.lower()).strip("_")
    if not normalized:
        return base_name
    return f"{base_name}__{normalized}"
