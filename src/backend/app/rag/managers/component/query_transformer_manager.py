from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.rag.components.base import BaseQueryTransformer
from app.rag.components.query_transformers.noop_transformer import NoOpQueryTransformer
from app.rag.components.query_transformers.hyde_transformer import HydeQueryTransformer

logger = logging.getLogger(__name__)

class QueryTransformerManager:
    """Orchestrator for query transformer components."""

    def __init__(self) -> None:
        self.transformers: dict[str, Type[BaseQueryTransformer]] = {
            "none": NoOpQueryTransformer,
            "hyde": HydeQueryTransformer,
        }

    def available_components(self) -> list[str]:
        return list(self.transformers.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseQueryTransformer:
        name = rag_config.get("rag", {}).get("query_transformer")
        if not name:
             # If strictly no defaults allowed, must raise or expect from caller
             raise ValueError("No query_transformer specified in 'rag.query_transformer' config.")
             
        if name not in self.transformers:
             raise ValueError(f"QueryTransformer '{name}' not registered. Available: {list(self.transformers.keys())}")
        
        component = self.transformers[name](rag_config)
        return component

    def preprocess(self, query: str) -> str:
        """Normalize query and detect basic language/intent."""
        import re
        # Basic normalization
        query = query.strip()
        query = re.sub(r'\s+', ' ', query)
        
        # Simple language marker detection (placeholder for more advanced NLP)
        if any(c in query for c in "¿¡"):
            # Potential Spanish detection
            pass
            
        logger.debug("Query normalized: %s", query[:50])
        return query

    async def process(
        self,
        rag_config: dict[str, Any],
        query: str,
    ) -> str:
        """Transform user query for retrieval."""
        # 1. Normalize
        query = self.preprocess(query)
        
        # 2. Transform
        transformer = self.resolve(rag_config)
        logger.info("QueryTransformer [%s] starting for query", transformer.name)
        start = time.perf_counter()

        transformed_query = await transformer.transform(query, rag_config)

        elapsed = time.perf_counter() - start
        logger.info("QueryTransformer [%s] produced transformed query in %.1fms", transformer.name, elapsed * 1000)
        return transformed_query
