from __future__ import annotations
import logging
import time
from typing import Any, Type, List, Dict

from app.rag.components.base import BaseQueryTransformer, BaseSelfQueryProcessor, BaseGuardrail
from app.rag.schemas.pipeline_models import QueryAnalysis
from app.rag.schemas.types import ChatMessage

from app.rag.components.query_transformers.hyde_transformer import HydeQueryTransformer
from app.rag.components.query_transformers.noop_transformer import NoOpQueryTransformer
from app.rag.components.query_transformers.openai_self_query import OpenAISelfQuery

logger = logging.getLogger(__name__)

class PreRetrievalManager:
    """Orchestrator for Pre-Retrieval stage: Expansion, Self-Querying, and History Condensation."""

    def __init__(self) -> None:
        self.transformers: Dict[str, Type[BaseQueryTransformer]] = {
            "hyde": HydeQueryTransformer,
            "none": NoOpQueryTransformer,
        }
        self.self_query_processors: Dict[str, Type[BaseSelfQueryProcessor]] = {
            "openai_self_query": OpenAISelfQuery,
        }
        self.guardrails: Dict[str, Type[BaseGuardrail]] = {
            # Registry to be populated
        }


    def _resolve_transformer(self, name: str) -> BaseQueryTransformer:
        if name not in self.transformers:
            raise ValueError(f"Transformer '{name}' not found.")
        return self.transformers[name]({}) # Simplified for now

    def _resolve_self_query(self, name: str) -> BaseSelfQueryProcessor:
        if name not in self.self_query_processors:
            raise ValueError(f"Self-Query Processor '{name}' not found.")
        return self.self_query_processors[name]({})

    async def analyze(
        self,
        query: str,
        rag_config: dict[str, Any],
        history: List[ChatMessage] | None = None,
    ) -> QueryAnalysis:
        """Execute Pre-Retrieval stage."""
        start = time.perf_counter()
        logger.info("Pre-Retrieval starting for query: %s", query)

        # 1. Condense History (Placeholder for now)
        condensed_query = query 
        
        # 2. Safety Check (Placeholder)
        is_safe = True

        # 3. Expansion (HyDE/Multi-query)
        expansion_name = rag_config.get("rag", {}).get("query_transformer")
        expanded_queries = [condensed_query]
        if expansion_name and expansion_name in self.transformers:
            transformer = self.transformers[expansion_name](rag_config)
            expanded_queries = await transformer.transform(condensed_query, rag_config)

        # 4. Self-Querying (Metadata extraction)
        self_query_name = rag_config.get("rag", {}).get("self_query")
        filters = {}
        if self_query_name and self_query_name in self.self_query_processors:
            processor = self.self_query_processors[self_query_name](rag_config)
            filters = await processor.process_query(condensed_query, rag_config)

        analysis = QueryAnalysis(
            original_query=query,
            condensed_query=condensed_query,
            expanded_queries=expanded_queries,
            filters=filters,
            is_safe=is_safe,
            metadata={"elapsed_ms": int((time.perf_counter() - start) * 1000)}
        )
        
        logger.info("Pre-Retrieval finished in %dms", analysis.metadata["elapsed_ms"])
        return analysis
