from __future__ import annotations

import logging
import time
from typing import Any, AsyncGenerator

from app.core.rag.types import ChatMessage, RagContext, RagExecutionResult, FileStatus
from app.core.rag.documents import Chunk, Document
from app.core.rag.schemas import FileConfig
from app.core.rag.pipeline_models import RAGDocument

from app.core.rag.managers.chunker_manager import ChunkerManager
from app.core.rag.managers.chat_context_manager import ChatContextManager
from app.core.rag.managers.embedder_manager import EmbedderManager
from app.core.rag.managers.generator_manager import GeneratorManager
from app.core.rag.managers.query_transformer_manager import QueryTransformerManager
from app.core.rag.managers.reader_manager import ReaderManager
from app.core.rag.managers.reranker_manager import RerankerManager
from app.core.rag.managers.retriever_manager import RetrieverManager
from app.core.rag.managers.vectorstore_manager import VectorStoreManager
from app.core.config import PlatformSettings
from app.modules.workspaces.schemas import WorkspaceSetting

logger = logging.getLogger(__name__)


def _setting_to_rag_config(setting: WorkspaceSetting) -> dict[str, Any]:
    """Convert a WorkspaceSetting to the flat dict expected by managers/components."""
    return setting.model_dump(mode="python")


class RagManager:
    """Central RAG orchestrator: component management, ingestion, and retrieval.

    All component configuration is driven exclusively by the ``WorkspaceSetting``
    passed into each operation.  No fallback resolution to ``PlatformSettings``
    occurs at runtime — defaults must be baked in when the setting is created.

    Pipeline flows:
        Ingestion:  Reader → Chunker → Embedder → VectorStore
        Retrieval:  QueryTransformer → EmbedQuery → Retriever → Reranker
                    → ChatContext → Generator
    """

    def __init__(self, settings: PlatformSettings) -> None:
        self.settings = settings

        # Component managers — pure orchestrators
        self.readers = ReaderManager()
        self.chunkers = ChunkerManager()
        self.embedders = EmbedderManager()
        self.vectorstores = VectorStoreManager()
        self.retrievers = RetrieverManager(vectorstores=self.vectorstores)
        self.rerankers = RerankerManager()
        self.query_transformers = QueryTransformerManager()
        self.generators = GeneratorManager()
        self.chat_context = ChatContextManager()

    # ── data transformation ───────────────────────────────

    def _to_rag_document(self, document: Document, context: RagContext) -> RAGDocument:
        """Convert an external Document into a pipeline-internal RAGDocument."""
        return RAGDocument(
            document_id=document.file_id,
            workspace_id=context.workspace_id,
            content=document.content,
            title=document.title,
            source=document.source,
            labels=list(document.labels),
            metadata={
                "extension": document.extension,
                "file_size": document.file_size,
            },
        )

    # ── ingestion ────────────────────────────────────────────

    async def import_document(
        self,
        setting: WorkspaceSetting,
        file_config: FileConfig,
        context: RagContext,
    ) -> list[Document]:
        """Full ingestion: read -> chunk -> embed -> persist.

        Pipeline data flow:
            Document → RAGDocument → populate chunks → embed chunks → store

        All component selections come from *setting*.
        *file_config* carries file-level data (content, filename, etc.).
        Returns the list of ingested documents (external type, for the caller).
        """
        logger.info("Starting ingestion for %s (ID: %s)", file_config.filename, file_config.file_id)
        rag_config = _setting_to_rag_config(setting)
        start = time.perf_counter()

        try:
            file_config.status = FileStatus.PROCESSING

            # 1. Read → list[Document]  (external type from reader)
            documents = self.readers.process(rag_config, file_config)

            # 2. Transform → list[RAGDocument]  (pipeline-internal)
            rag_documents = [self._to_rag_document(doc, context) for doc in documents]

            # 3. Chunk → populates doc.chunks on each RAGDocument
            rag_documents = self.chunkers.process(rag_config, rag_documents)

            # 4. Embed → populates chunk.embedded_contexts on each chunk
            rag_documents = await self.embedders.process(rag_config, rag_documents)

            # 5. Persist to vector store
            await self.vectorstores.persist(
                rag_config,
                rag_documents,
                collection_name=context.collection_name,
                context_meta={
                    "workspace_id": context.workspace_id,
                    "organization_id": context.organization_id,
                },
            )

            file_config.status = FileStatus.COMPLETED
            total_chunks = sum(len(doc.chunks) for doc in rag_documents)
            elapsed = time.perf_counter() - start
            logger.info(
                "Successfully ingested %s (%d doc(s), %d chunk(s), %.1fms)",
                file_config.filename,
                len(documents),
                total_chunks,
                elapsed * 1000,
            )
            return documents

        except Exception as exc:
            file_config.status = FileStatus.FAILED
            file_config.status_report["error"] = str(exc)
            logger.error("Failed to ingest %s: %s", file_config.filename, exc)
            raise

    # ── retrieval ────────────────────────────────────────────

    async def retrieve(
        self,
        query: str,
        context: RagContext,
        setting: WorkspaceSetting,
        conversation_history: list[ChatMessage] | None = None,
    ) -> RagExecutionResult:
        """Full retrieval: transform → embed → retrieve → rerank → generate."""
        rag_config = _setting_to_rag_config(setting)

        # 1. Query transformation
        transformed_query = await self.query_transformers.process(rag_config, query)

        # 2. Embed query
        query_embedding = await self.embedders.embed_query(rag_config, transformed_query)
        query_embedding.metadata.setdefault("query_text", query)

        # 3. Retrieve (vectorstore injection + score_threshold handled by RetrieverManager)
        chunks = await self.retrievers.process(
            rag_config,
            query_embedding,
            collection_name=context.collection_name,
            filters=context.filters,
            top_k=context.top_k,
        )

        # 4. Rerank (top_k resolved from rag_config by RerankerManager)
        chunks = await self.rerankers.process(rag_config, query, chunks)

        # 6. Build chat context
        messages = self.chat_context.process(
            rag_config,
            query=query,
            retrieved_chunks=chunks,
            conversation_history=conversation_history or [],
        )

        # 7. Generate answer
        answer = await self.generators.process(rag_config, messages)

        return RagExecutionResult(
            answer=answer,
            prompt=messages[-1].content if messages else query,
            transformed_query=transformed_query,
            chunks=chunks,
        )

    async def retrieve_stream(
        self,
        query: str,
        context: RagContext,
        setting: WorkspaceSetting,
        conversation_history: list[ChatMessage] | None = None,
    ) -> AsyncGenerator[str, None]:
        """Same as retrieve but streams the generator output token-by-token."""
        rag_config = _setting_to_rag_config(setting)

        transformed_query = await self.query_transformers.process(rag_config, query)
        query_embedding = await self.embedders.embed_query(rag_config, transformed_query)
        query_embedding.metadata.setdefault("query_text", query)

        chunks = await self.retrievers.process(
            rag_config,
            query_embedding,
            collection_name=context.collection_name,
            filters=context.filters,
            top_k=context.top_k,
        )

        chunks = await self.rerankers.process(rag_config, query, chunks)

        messages = self.chat_context.process(
            rag_config,
            query=query,
            retrieved_chunks=chunks,
            conversation_history=conversation_history or [],
        )

        async for token in self.generators.process_stream(rag_config, messages):
            yield token

    # ── document lifecycle ──────────────────────────────────

    async def delete_document(
        self, file_id: str, context: RagContext, setting: WorkspaceSetting
    ) -> None:
        """Remove all chunks for a file_id from the vector store."""
        rag_config = _setting_to_rag_config(setting)
        await self.vectorstores.delete_document(rag_config, file_id)

    async def get_document(
        self, file_id: str, context: RagContext, setting: WorkspaceSetting
    ) -> list[Chunk]:
        """Fetch all chunks associated with a document."""
        rag_config = _setting_to_rag_config(setting)
        return await self.vectorstores.get_document_chunks(rag_config, file_id)