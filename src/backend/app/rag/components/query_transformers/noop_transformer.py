from __future__ import annotations
from typing import Any
from app.rag.components.base import BaseQueryTransformer

class NoOpQueryTransformer(BaseQueryTransformer):
    """Passthrough query transformer."""
    name = "none"
    description = "Return the query unchanged."
    requirement = []
    config = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass



    async def transform(self, query: str, rag_config: dict[str, Any]) -> list[str]:
        return [query]

