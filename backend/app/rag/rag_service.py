import time
from typing import List, Optional, Any, Dict

import structlog
from backend.app.core.telemetry import (
    get_tracer,
    EMBEDDING_REQUEST_LATENCY,
)
from backend.app.rag.advanced_retrieval import (
    MultiQueryRetriever,
    ContextualCompressor,
    RetrievalResult,
)

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class RAGService:
    async def chunk_text(self, text: str, workspace_id: str) -> List[str]:
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
        self, texts: List[str], workspace_id: str
    ) -> List[List[float]]:
        """Generate embeddings using the flexible provider via ProviderFactory."""
        from backend.app.core.factory import ProviderFactory

        with tracer.start_as_current_span(
            "rag.generate_embeddings",
            attributes={
                "rag.num_texts": len(texts),
                "workspace_id": workspace_id or "default",
            },
        ):
            start = time.perf_counter()
            provider = await ProviderFactory.get_embeddings(workspace_id)
            result = await provider.aembed_documents(texts)
            duration = time.perf_counter() - start

            provider_name = type(provider).__name__
            EMBEDDING_REQUEST_LATENCY.labels(provider=provider_name).observe(duration)

            logger.debug(
                "embeddings_generated",
                num_texts=len(texts),
                provider=provider_name,
                duration_ms=round(duration * 1000, 2),
            )
            return result

    async def get_query_embedding(
        self, query: str, workspace_id: str
    ) -> List[float]:
        """Generate embedding for a single query."""
        from backend.app.core.factory import ProviderFactory

        provider = await ProviderFactory.get_embeddings(workspace_id)
        return await provider.aembed_query(query)

    async def search(
        self,
        query: str,
        workspace_id: str,
        limit: Optional[int] = None,
    ) -> list:
        """
        Modular retrieval using LangChain Retrievers.
        Decisions are guided by Schema, execution by LangChain.
        """
        from backend.app.core.factory import ProviderFactory
        from backend.app.core.settings_manager import settings_manager

        with tracer.start_as_current_span(
            "rag.search",
            attributes={
                "workspace_id": workspace_id,
                "rag.query_preview": query[:80],
            },
        ):
            start = time.perf_counter()

            # Execute retrieval via adapter pattern
            store = await ProviderFactory.get_vector_store(workspace_id)
            settings = await settings_manager.get_settings(workspace_id)

            query_vector = await self.get_query_embedding(query, workspace_id)

            search_results = await store.search(
                config=settings.retrieval,
                query_vector=query_vector,
                query_text=query,
                workspace_id=workspace_id,
            )

            results = []
            for res in search_results:
                results.append(
                    {
                        "text": res.payload.get("text", ""),
                        "payload": res.payload,
                        "score": res.score,
                    }
                )

            # --- Optional Reranking Step ---
            if settings.retrieval.rerank.enabled:
                from backend.app.providers.reranker import get_reranker
                reranker = await get_reranker(workspace_id)
                if reranker:
                    # Reranker expects Dict with 'payload': {'text': ...}
                    # Our results already match this structure mostly
                    top_n = settings.retrieval.rerank.top_n
                    reranked = await reranker.rerank(query, results, top_k=top_n)
                    results = reranked

            duration = time.perf_counter() - start
            logger.info(
                "rag_search_complete",
                results=len(results),
                rerank_enabled=settings.retrieval.rerank.enabled,
                duration_ms=round(duration * 1000, 2),
                workspace_id=workspace_id,
            )

            return results

    async def execute(
        self,
        query: str,
        workspace_id: str,
        settings: Optional[Any] = None,  # RuntimeSettings
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
        ):
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
                "answer": final_state.get("final_answer")
                or (
                    final_state.get("draft_answers")[0]
                    if final_state.get("draft_answers")
                    else "No answer generated."
                ),
                "context": final_state.get("final_context", ""),
                "tracing": metadata,
            }

    async def search_advanced(
        self,
        query: str,
        workspace_id: str,
        limit: Optional[int] = None,
        enable_multi_query: bool = False,
        enable_compression: bool = False,
        llm_client = None,
    ) -> List[Dict[str, Any]]:
        """
        Advanced search with optional multi-query and compression.
        
        Args:
            query: Search query
            workspace_id: Workspace ID
            limit: Max results
            enable_multi_query: Use query variations for better recall
            enable_compression: Compress results to relevant parts
            llm_client: LLM client for multi-query and compression
            
        Returns:
            List of search results
        """
        with tracer.start_as_current_span(
            "rag.search_advanced",
            attributes={
                "workspace_id": workspace_id,
                "multi_query": enable_multi_query,
                "compression": enable_compression,
            },
        ):
            start = time.perf_counter()
            
            # Base search function
            async def base_search(q: str, top_k: int) -> List[RetrievalResult]:
                results = await self.search(q, workspace_id, limit=top_k)
                return [
                    RetrievalResult(
                        text=r["text"],
                        score=r["score"],
                        metadata=r["payload"],
                        source=r["payload"].get("source", "unknown"),
                    )
                    for r in results
                ]
            
            # Apply multi-query if enabled
            if enable_multi_query and llm_client:
                retriever = MultiQueryRetriever(llm_client, num_variations=3)
                results = await retriever.retrieve(
                    query=query,
                    retriever_fn=base_search,
                    top_k_per_query=limit or 5,
                )
            else:
                results = await base_search(query, limit or 5)
            
            # Apply compression if enabled
            if enable_compression and llm_client and results:
                compressor = ContextualCompressor(llm_client)
                results = await compressor.compress(query, results)
            
            # Convert back to dict format
            dict_results = [
                {
                    "text": r.text,
                    "payload": r.metadata,
                    "score": r.score,
                }
                for r in results
            ]
            
            duration = time.perf_counter() - start
            logger.info(
                "rag_advanced_search_complete",
                results=len(dict_results),
                multi_query=enable_multi_query,
                compression=enable_compression,
                duration_ms=round(duration * 1000, 2),
                workspace_id=workspace_id,
            )
            
            return dict_results


rag_service = RAGService()  
