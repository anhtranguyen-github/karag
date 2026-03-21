from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.core.rag.components.base import BaseQueryTransformer
from app.core.rag.components.query_transformers.hyde_transformer import HyDEQueryTransformer
from app.core.rag.components.query_transformers.identity_transformer import IdentityTransformer

logger = logging.getLogger(__name__)


class QueryTransformerManager:
    """Orchestrator for query transformer components."""

    def __init__(self) -> None:
        self.transformers: dict[str, Type[BaseQueryTransformer]] = {
            "hyde": HyDEQueryTransformer,
            "identity": IdentityTransformer,
        }

    def available_components(self) -> list[str]:
        return list(self.transformers.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseQueryTransformer:
        name = rag_config.get("rag", {}).get("query_transformer", "")
        if name not in self.transformers:
            raise ValueError(f"QueryTransformer '{name}' not registered. Available: {list(self.transformers.keys())}")
        component = self.transformers[name](rag_config)
        component.check_dependencies()
        return component

    async def process(self, rag_config: dict[str, Any], query: str) -> str:
        """Transform a query string."""
        transformer = self.resolve(rag_config)
        logger.info("QueryTransformer [%s] transforming query", transformer.name)
        start = time.perf_counter()

        result = await transformer.transform(query, rag_config)

        elapsed = time.perf_counter() - start
        logger.info("QueryTransformer [%s] done in %.1fms", transformer.name, elapsed * 1000)
        return result