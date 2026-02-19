import time
from typing import List, Optional, Any, Dict

import structlog
from backend.app.core.telemetry import (
    get_tracer,
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
        """Generate embeddings using the flexible provider via LangChain Factory."""
        from backend.app.core.factory import LangChainFactory
        
        with tracer.start_as_current_span(
            "rag.generate_embeddings",
            attributes={
                "rag.num_texts": len(texts),
                "workspace_id": workspace_id or "default",
            },
        ):
            start = time.perf_counter()
            provider = await LangChainFactory.get_embeddings(workspace_id)
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
        self, query: str, workspace_id: Optional[str] = None
    ) -> List[float]:
        """Generate embedding for a single query."""
        from backend.app.core.factory import LangChainFactory
        provider = await LangChainFactory.get_embeddings(workspace_id)
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
        from backend.app.core.factory import LangChainFactory

        with tracer.start_as_current_span(
            "rag.search",
            attributes={
                "workspace_id": workspace_id,
                "rag.query_preview": query[:80],
            },
        ):
            start = time.perf_counter()
            
            # Use retriever factory to get the configured implementation layer
            retriever = await LangChainFactory.get_retriever(workspace_id)
            
            # Execute retrieval
            # Note: LangChain retrievers return Document objects, we map them back to our result schema
            docs = await retriever.ainvoke(query)
            
            results = []
            for doc in docs:
                results.append({
                    "text": doc.page_content,
                    "payload": {
                        "text": doc.page_content,
                        **doc.metadata
                    },
                    "score": getattr(doc, "score", None)
                })

            duration = time.perf_counter() - start
            logger.info(
                "rag_search_complete",
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
                "answer": final_state.get("final_answer") or (final_state.get("draft_answers")[0] if final_state.get("draft_answers") else "No answer generated."),
                "context": final_state.get("final_context", ""),
                "tracing": metadata
            }


rag_service = RAGService()
