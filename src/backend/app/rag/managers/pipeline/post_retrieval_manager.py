from __future__ import annotations
import logging
import time
from typing import Any, List, Dict, Type

from app.rag.components.base import BaseReranker, BaseMasker
from app.rag.schemas.pipeline_models import RetrievalSet, RefinedContext
from app.rag.schemas.types import RetrievedChunk, PIISpan

from app.rag.components.rerankers.jina_reranker import JinaReranker
from app.rag.components.rerankers.noop_reranker import NoOpReranker
from app.rag.components.post_retrieval.simple_masker import SimpleMasker

logger = logging.getLogger(__name__)

class PostRetrievalManager:
    """Orchestrator for Post-Retrieval stage: Reranking, Deduplication, and Masking."""

    def __init__(self) -> None:
        self.rerankers: Dict[str, Type[BaseReranker]] = {
            "jina": JinaReranker,
            "none": NoOpReranker,
        }
        self.maskers: Dict[str, Type[BaseMasker]] = {
            "simple": SimpleMasker,
        }

    async def refine(
        self,
        retrieval_set: RetrievalSet,
        rag_config: dict[str, Any],
    ) -> RefinedContext:
        """Execute Post-Retrieval stage."""
        start = time.perf_counter()
        chunks = retrieval_set.candidates
        query = retrieval_set.query_analysis.original_query
        
        # 1. Rerank
        reranker_name = (
            rag_config.get("reranker", {}).get("component")
            or rag_config.get("rag", {}).get("reranker")
            or "jina"
        )
        if reranker_name in self.rerankers:
            reranker = self.rerankers[reranker_name](rag_config)
            chunks = await reranker.rerank(query, chunks, top_k=len(chunks))
        
        # 2. PII Masking (optional based on config)
        all_masked_spans = []
        if rag_config.get("rag", {}).get("pii_masking"):
            masker = SimpleMasker(rag_config)
            for chunk in chunks:
                masked_text, spans = await masker.mask(chunk.text, rag_config)
                chunk.text = masked_text
                all_masked_spans.extend(spans)
        
        # 3. Final selection (Provenance mapping)
        provenance = {c.chunk_id: c.document_title for c in chunks}
        
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        logger.info("Post-Retrieval finished in %dms", elapsed_ms)
        
        return RefinedContext(
            ranked_chunks=chunks,
            masked_spans=all_masked_spans,
            provenance_map=provenance,
            metadata={"elapsed_ms": elapsed_ms}
        )
