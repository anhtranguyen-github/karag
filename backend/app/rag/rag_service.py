import time
from typing import List, Optional, Any, Dict

import structlog
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.app.providers.embedding import get_embeddings
from backend.app.core.telemetry import (
    get_tracer,
    RAG_RETRIEVAL_LATENCY,
    RAG_CHUNKS_RETRIEVED,
    EMBEDDING_REQUEST_LATENCY,
)

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class RAGService:
    async def chunk_text(
        self, text: str, workspace_id: Optional[str] = None
    ) -> List[str]:
        """Split text into chunks using selected strategy."""
        from backend.app.core.settings_manager import settings_manager
        from backend.app.rag.chunking.registry import chunking_registry

        settings = await settings_manager.get_settings(workspace_id)
        config = settings.chunking

        with tracer.start_as_current_span(
            "rag.chunk_text",
            attributes={
                "strategy": config.strategy,
                "workspace_id": workspace_id or "default",
            },
        ) as span:
            chunks = await chunking_registry.chunk_text(
                text, config, workspace_id=workspace_id
            )

            span.set_attribute("rag.num_chunks", len(chunks))
            span.set_attribute("rag.text_length", len(text))
            
            logger.debug(
                "text_chunked",
                num_chunks=len(chunks),
                text_length=len(text),
                workspace_id=workspace_id,
                strategy=config.strategy,
            )
            return chunks

    async def get_embeddings(
        self, texts: List[str], workspace_id: Optional[str] = None
    ) -> List[List[float]]:
        """Generate embeddings using the flexible provider."""
        with tracer.start_as_current_span(
            "rag.generate_embeddings",
            attributes={
                "rag.num_texts": len(texts),
                "workspace_id": workspace_id or "default",
            },
        ) as span:
            start = time.perf_counter()
            provider = await get_embeddings(workspace_id)
            result = await provider.aembed_documents(texts)
            duration = time.perf_counter() - start

            # Record embedding latency by provider type
            provider_name = type(provider).__name__
            EMBEDDING_REQUEST_LATENCY.labels(provider=provider_name).observe(duration)

            span.set_attribute("rag.embedding_provider", provider_name)
            span.set_attribute("rag.embedding_duration_ms", round(duration * 1000, 2))
            if result:
                span.set_attribute("rag.vector_dim", len(result[0]))

            logger.debug(
                "embeddings_generated",
                num_texts=len(texts),
                provider=provider_name,
                duration_ms=round(duration * 1000, 2),
            )
            return result

    async def get_query_embedding(
        self, query: str, workspace_id: Optional[str] = None
    ) -> List[float]:
        """Generate embedding for a single query."""
        with tracer.start_as_current_span(
            "rag.query_embedding",
            attributes={"workspace_id": workspace_id or "default"},
        ):
            provider = await get_embeddings(workspace_id)
            return await provider.aembed_query(query)

    async def search(
        self,
        query: str,
        workspace_id: str,
        limit: Optional[int] = None,
    ) -> list:
        """
        Unified modular retrieval pipeline.
        Executes search modules based on workspace configuration.
        """
        from backend.app.core.settings_manager import settings_manager
        from backend.app.rag.qdrant_provider import qdrant
        from backend.app.rag.graph_provider import graph_provider

        settings = await settings_manager.get_settings(workspace_id)
        config = settings.retrieval
        search_limit = limit or config.vector.top_k

        with tracer.start_as_current_span(
            "rag.search",
            attributes={
                "rag.vector_enabled": config.vector.enabled,
                "rag.graph_enabled": config.graph.enabled,
                "rag.rerank_enabled": config.rerank.enabled,
                "rag.limit": search_limit,
                "workspace_id": workspace_id,
                "rag.query_preview": query[:80],
            },
        ) as span:
            start = time.perf_counter()
            results = []

            # 1. Graph-Enriched Vector Search or Hybrid Search
            # We follow the configured modules.
            
            # Generate Query Vector if vector search is needed
            query_vector = None
            if config.vector.enabled or (config.graph.enabled and config.graph.merge_with_vector):
                query_vector = await self.get_query_embedding(query, workspace_id)

            if config.graph.enabled:
                # Executes graph search, potentially merging with vector
                results = await graph_provider.search(
                    query=query,
                    query_vector=query_vector,
                    workspace_id=workspace_id,
                    limit=search_limit,
                    # We pass graph-specific overrides from config here if graph_provider supports it
                    # hops=config.graph.max_hops, etc.
                )
            elif config.vector.enabled:
                # Fallback to standard vector/hybrid search
                results = await qdrant.hybrid_search(
                    collection_name="knowledge_base",
                    query_vector=query_vector,
                    query_text=query,
                    limit=search_limit,
                    alpha=config.vector.dense_weight if config.vector.enable_hybrid else 1.0,
                    workspace_id=workspace_id,
                )

            # 2. Optional Reranking
            if config.rerank.enabled and results:
                from backend.app.providers.reranker import get_reranker
                reranker = await get_reranker(workspace_id)
                if reranker:
                    rerank_start = time.perf_counter()
                    results = await reranker.rerank(
                        query=query, 
                        documents=results, 
                        top_k=config.rerank.top_n
                    )
                    rerank_duration = time.perf_counter() - rerank_start
                    span.set_attribute("rag.rerank_duration_ms", round(rerank_duration * 1000, 2))
                    span.set_attribute("rag.reranker", type(reranker).__name__)
                    logger.info("rag_rerank_complete", provider=type(reranker).__name__, duration_ms=round(rerank_duration * 1000, 2))

            duration = time.perf_counter() - start

            # Metrics
            engine_tag = "graph" if config.graph.enabled else "vector"
            RAG_RETRIEVAL_LATENCY.labels(engine=engine_tag, mode="modular").observe(duration)
            RAG_CHUNKS_RETRIEVED.labels(engine=engine_tag).observe(len(results))

            span.set_attribute("rag.results_count", len(results))
            span.set_attribute("rag.duration_ms", round(duration * 1000, 2))

            logger.info(
                "rag_search_complete",
                engine=engine_tag,
                mode="modular",
                results=len(results),
                duration_ms=round(duration * 1000, 2),
                workspace_id=workspace_id,
            )

            return results

    async def execute(
        self,
        query: str,
        workspace_id: str,
        settings: Optional[Any] = None, # RuntimeSettings
    ) -> Dict[str, Any]:
        """
        Execute the RAG flow via the LangGraph orchestrator.
        """
        from backend.app.rag.graph.orchestrator import rag_executor
        from backend.app.schemas.execution import RuntimeSettings

        if settings is None:
            settings = RuntimeSettings()
        elif isinstance(settings, dict):
            settings = RuntimeSettings(**settings)

        initial_state = {
            "query": query,
            "workspace_id": workspace_id,
            "settings": settings,
            "generated_queries": [],
            "retrieved_results": [],
            "draft_answers": [],
            "loop_count": 0,
            "confidence_level": 0.0,
            "is_sufficient": False,
        }

        with tracer.start_as_current_span(
            "rag.graph_execute",
            attributes={
                "mode": settings.execution_mode,
                "workspace_id": workspace_id,
            },
        ) as span:
            start_time = time.perf_counter()
            final_state = await rag_executor.ainvoke(initial_state)
            duration = (time.perf_counter() - start_time) * 1000

            metadata = final_state.get("execution_metadata", {})
            metadata["duration_ms"] = round(duration, 2)
            metadata["loops"] = final_state.get("loop_count", 0)
            metadata["final_confidence"] = final_state.get("confidence_level")
            metadata["queries"] = final_state.get("generated_queries", [])
            
            logger.info(
                "graph_execution_complete",
                mode=settings.execution_mode,
                duration_ms=round(duration, 2),
                workspace_id=workspace_id,
            )

            return {
                "answer": final_state.get("final_answer") or (final_state.get("draft_answers")[0] if final_state.get("draft_answers") else "No answer generated."),
                "context": final_state.get("final_context", ""),
                "tracing": metadata
            }


rag_service = RAGService()
