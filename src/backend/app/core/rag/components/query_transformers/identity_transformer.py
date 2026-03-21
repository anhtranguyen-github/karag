from __future__ import annotations

from typing import Any

from app.core.rag.components.base import BaseQueryTransformer


class IdentityTransformer(BaseQueryTransformer):
    """Passes the query through without modification."""

    name = "identity"
    description = "Passes the query through without modification."
    requires_library: list[str] = []
    config: dict[str, Any] = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass

    def check_dependencies(self) -> None:
        pass

    async def transform(self, query: str, rag_config: dict[str, Any]) -> str:
        return query