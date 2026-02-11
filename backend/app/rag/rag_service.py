import time
from typing import List, Optional

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
        """Split text into chunks using hierarchical recursive splitting."""
        from backend.app.core.settings_manager import settings_manager

        settings = await settings_manager.get_settings(workspace_id)

        with tracer.start_as_current_span(
            "rag.chunk_text",
            attributes={
                "chunk_size": settings.chunk_size,
                "chunk_overlap": settings.chunk_overlap,
                "workspace_id": workspace_id or "default",
            },
        ) as span:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
                separators=["\n\n", "\n", ". ", "! ", "? ", "; ", " ", ""],
                add_start_index=True,
            )
            # Clean text first
            text = " ".join(text.split())
            chunks = splitter.split_text(text)

            span.set_attribute("rag.num_chunks", len(chunks))
            span.set_attribute("rag.text_length", len(text))
            logger.debug(
                "text_chunked",
                num_chunks=len(chunks),
                text_length=len(text),
                workspace_id=workspace_id,
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
        Unified retrieval entry point.
        Executes the fixed pipeline configured for the workspace.
        """
        from backend.app.core.settings_manager import settings_manager
        from backend.app.rag.qdrant_provider import qdrant
        from backend.app.rag.graph_provider import graph_provider

        settings = await settings_manager.get_settings(workspace_id)
        search_limit = limit or settings.search_limit
        engine = settings.rag_engine

        with tracer.start_as_current_span(
            "rag.search",
            attributes={
                "rag.engine": engine,
                "rag.limit": search_limit,
                "workspace_id": workspace_id,
                "rag.query_preview": query[:80],
            },
        ) as span:
            start = time.perf_counter()

            # 1. Generate Query Vector
            query_vector = await self.get_query_embedding(query, workspace_id)

            # 2. Execute Unified Pipeline (Internal Complexity Hidden)
            # Both paths internally use hybrid search, but the graph path applies discovered context.
            if engine == "graph":
                results = await graph_provider.search(
                    query=query,
                    query_vector=query_vector,
                    workspace_id=workspace_id,
                    limit=search_limit,
                )
            else:
                results = await qdrant.hybrid_search(
                    collection_name="knowledge_base",
                    query_vector=query_vector,
                    query_text=query,
                    limit=search_limit,
                    alpha=settings.hybrid_alpha,
                    workspace_id=workspace_id,
                )

            duration = time.perf_counter() - start

            # Metrics
            RAG_RETRIEVAL_LATENCY.labels(engine=engine, mode="unified").observe(duration)
            RAG_CHUNKS_RETRIEVED.labels(engine=engine).observe(len(results))

            span.set_attribute("rag.results_count", len(results))
            span.set_attribute("rag.duration_ms", round(duration * 1000, 2))

            logger.info(
                "rag_search_complete",
                engine=engine,
                mode="unified",
                results=len(results),
                duration_ms=round(duration * 1000, 2),
                workspace_id=workspace_id,
            )

            return results


rag_service = RAGService()
