from __future__ import annotations
import logging
import time
import asyncio
from typing import Any, List, Dict, Type

from app.rag.components.base import BaseRetriever, BaseVectorStore
from app.rag.schemas.pipeline_models import QueryAnalysis, RetrievalSet
from app.rag.schemas.types import RetrievedChunk, RagContext, Embedding
from app.rag.managers.component.vectorstore_manager import VectorStoreManager
from app.rag.managers.component.embedder_manager import EmbedderManager

from app.rag.components.retrievers.vector_retriever import VectorRetriever
from app.rag.components.retrievers.hybrid_retriever import HybridRetriever

logger = logging.getLogger(__name__)

class RetrievalManager:
    """Orchestrator for Retrieval stage: Multi-strategy search and RRF fusion."""

    def __init__(self, vectorstore_manager: VectorStoreManager, embedder_manager: EmbedderManager) -> None:
        self.vectorstore_manager = vectorstore_manager
        self.embedder_manager = embedder_manager
        self.retrievers: Dict[str, Type[BaseRetriever]] = {
            "dense": VectorRetriever,
            "hybrid": HybridRetriever,
            # "bm25": BM25Retriever, # registry for BM25
        }

    async def _search_one(
        self,
        query: str,
        strategy: str,
        filters: dict[str, Any],
        context: RagContext,
        rag_config: dict[str, Any],
    ) -> list[RetrievedChunk]:
        """Execute a single search task."""
        try:
            # 1. Resolve strategy
            if strategy not in self.retrievers:
                logger.warning("Strategy '%s' not found, skipping.", strategy)
                return []
            
            retriever_cls = self.retrievers[strategy]
            retriever = retriever_cls(rag_config)
            
            # 2. Resolve VectorStore
            vs = self.vectorstore_manager.resolve(rag_config)
            retriever.set_vectorstore(vs)
            
            # 3. Embed query if needed (Dense/Hybrid)
            # Most retrievers in our system need an embedding for the specific query
            # (In a real system, we might cache this)
            query_embedding = await self.embedder_manager.embed_query(rag_config, query)
            
            # 4. Search
            chunks = await retriever.retrieve(
                query_embedding,
                top_k=context.top_k,
                collection_name=context.collection_name,
                filters=filters,
            )
            return chunks
        except Exception as e:
            logger.error("Search failed for strategy '%s' and query '%s': %s", strategy, query[:30], e)
            return []

    def _rrf_fuse(self, batch_results: list[list[RetrievedChunk]], k: int = 60) -> list[RetrievedChunk]:
        """Reciprocal Rank Fusion (RRF) to merge multiple ranked lists."""
        scores: Dict[str, float] = {}
        chunk_map: Dict[str, RetrievedChunk] = {}
        
        for chunk_list in batch_results:
            for rank, chunk in enumerate(chunk_list):
                cid = chunk.chunk_id
                if cid not in chunk_map:
                    chunk_map[cid] = chunk
                
                # RRF score = 1 / (k + rank)
                scores[cid] = scores.get(cid, 0.0) + (1.0 / (k + rank))
        
        # Sort by fused score
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        
        results = []
        for cid in sorted_ids:
            chunk = chunk_map[cid]
            chunk.score = scores[cid] # Update score to fused score
            results.append(chunk)
            
        return results

    async def retrieve(
        self,
        analysis: QueryAnalysis,
        rag_config: dict[str, Any],
        context: RagContext,
    ) -> RetrievalSet:
        """Execute Retrieval stage: Parallel searches -> Fusion."""
        start = time.perf_counter()
        
        # 1. Combine filters
        merged_filters = {**context.filters, **analysis.filters}
        
        # 2. Prepare strategies
        strategies = rag_config.get("retrieval", {}).get("strategies", ["dense"])
        if isinstance(strategies, str):
            strategies = [strategies]
            
        # 3. Trigger parallel searches
        tasks = []
        for q in analysis.expanded_queries:
            for strategy in strategies:
                tasks.append(self._search_one(q, strategy, merged_filters, context, rag_config))
        
        if not tasks:
            return RetrievalSet(query_analysis=analysis, candidates=[])
            
        # 4. Wait for all search tasks
        all_results = await asyncio.gather(*tasks)
        
        # 5. Fusion (RRF)
        fused_chunks = self._rrf_fuse(all_results)
        
        # 6. Final Top_K (from context)
        final_chunks = fused_chunks[:context.top_k]
        
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        logger.info("Retrieval Manager finished in %dms, found %d unique chunks from %d searches", 
                    elapsed_ms, len(fused_chunks), len(tasks))
                    
        return RetrievalSet(
            query_analysis=analysis,
            candidates=final_chunks,
            metadata={"elapsed_ms": elapsed_ms, "search_count": len(tasks)}
        )
