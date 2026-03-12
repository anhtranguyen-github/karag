from __future__ import annotations

import logging
import time
from typing import Any, AsyncGenerator, List, Dict

from app.rag.schemas.types import ChatMessage, RagContext, RagExecutionResult, FileStatus
from app.rag.schemas.documents import Chunk, Document
from app.rag.schemas.schemas import FileConfig
from app.rag.schemas.pipeline_models import RAGDocument

from app.rag.managers.component.chunker_manager import ChunkerManager
from app.rag.managers.component.embedder_manager import EmbedderManager
from app.rag.managers.component.reader_manager import ReaderManager
from app.rag.managers.component.reranker_manager import RerankerManager
from app.rag.managers.component.retriever_manager import RetrieverManager
from app.rag.managers.component.vectorstore_manager import VectorStoreManager
from app.rag.managers.component.chat_context_manager import ChatContextManager
from app.rag.managers.component.inference_manager import InferenceManager
from app.rag.managers.component.query_transformer_manager import QueryTransformerManager
from app.rag.managers.pipeline.inference_pipeline import InferencePipeline


from app.core.config import PlatformSettings
from app.modules.workspaces.schemas import WorkspaceSetting

logger = logging.getLogger(__name__)

def _setting_to_rag_config(setting: WorkspaceSetting) -> dict[str, Any]:
    return setting.model_dump(mode="python")

class RagManager:
    """Central RAG orchestrator: component management, ingestion, and retrieval.
    Follows: FileConfig → Reader → Document → Chunker → RAGChunk → RAGDocument
    """

    def __init__(self, settings: PlatformSettings) -> None:
        self.settings = settings
        self.readers = ReaderManager()
        self.chunkers = ChunkerManager()
        self.embedders = EmbedderManager()
        self.vectorstores = VectorStoreManager()
        self.retrievers = RetrieverManager(vectorstores=self.vectorstores)
        self.rerankers = RerankerManager()
        self.query_transformers = QueryTransformerManager()
        self.inference = InferenceManager()
        self.chat_context = ChatContextManager()
        self.pipeline = InferencePipeline(self)


    def _to_rag_document(self, document: Document, context: RagContext) -> RAGDocument:
        """Convert a Parse-time Document into a Engine-time RAGDocument."""
        return RAGDocument(
            document_id=f"rag_doc_{document.file_id}",
            file_id=document.file_id,
            workspace_id=context.workspace_id,
            content=document.content,
            title=document.title,
            source=document.source,
            labels=list(document.labels),
            metadata={
                **document.metadata,
                "project_id": context.project_id,
                "organization_id": context.organization_id,
            },
        )

    async def import_document(
        self,
        setting: WorkspaceSetting,
        file_config: FileConfig,
        content_bytes: bytes,
        context: RagContext,
        on_progress: Any | None = None, # Async callback(status: str, progress: int)
    ) -> list[Document]:
        """Full ingestion: read -> chunk -> embed -> persist.
        Execution flow uses content_bytes for parsing, ensuring FileConfig remains metadata-only.
        """
        logger.info("Starting ingestion for %s (ID: %s)", file_config.filename, file_config.file_id)
        rag_config = _setting_to_rag_config(setting)
        start = time.perf_counter()

        async def _notify(status: str, progress: int):
            if on_progress:
                await on_progress(status, progress)

        try:
            file_config.status = FileStatus.PROCESSING
            await _notify("reading", 10)

            # 1. Resolve Reader based on extension if not explicitly set to something else
            rag_cfg = rag_config.get("rag", {})
            current_reader = rag_cfg.get("reader")
            
            if not current_reader or current_reader == "marker":
                 ext = file_config.extension.lower()
                 if ext in ["txt", "md"]:
                     rag_config.setdefault("rag", {})["reader"] = "text"
                 elif ext == "pdf":
                     # Use 'marker' if it is the current_reader OR if no reader was specified
                     rag_config.setdefault("rag", {})["reader"] = "marker"
                 elif not current_reader:
                      rag_config.setdefault("rag", {})["reader"] = "simple_pdf"

            
            # 1. Read (bytes -> list[Document])
            documents = await self.readers.process(rag_config, file_config, content_bytes)
            await _notify("chunking", 30)

            # 2. Transform (Document -> RAGDocument)
            rag_documents = [self._to_rag_document(doc, context) for doc in documents]

            # 3. Chunk (populates chunks on RAGDocument)
            rag_documents = await self.chunkers.process(rag_config, rag_documents)
            await _notify("embedding", 50)

            # 4. Embed (populates vectors on chunks)
            rag_documents = await self.embedders.process(rag_config, rag_documents)
            await _notify("storing", 80)

            # 5. Persist to vector store
            await self.vectorstores.persist(
                rag_config,
                rag_documents,
                collection_name=context.collection_name,
                context_meta={
                    "workspace_id": context.workspace_id,
                    "organization_id": context.organization_id,
                    "filename": file_config.filename,
                },
            )

            file_config.status = FileStatus.COMPLETED
            await _notify("completed", 100)
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
            await _notify("failed", 0) # Could add error message to notify
            logger.error("Failed to ingest %s: %s", file_config.filename, exc)
            raise

    async def retrieve(
        self,
        query: str,
        context: RagContext,
        setting: WorkspaceSetting,
        conversation_history: list[ChatMessage] | None = None,
    ) -> RagExecutionResult:
        """Execute the 4-stage RAG pipeline (Pre-Ref-Post-Inf) via the InferencePipeline."""
        return await self.pipeline.run(query, context, setting, conversation_history)

    async def retrieve_stream(
        self,
        query: str,
        context: RagContext,
        setting: WorkspaceSetting,
        conversation_history: list[ChatMessage] | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream the 4-stage RAG pipeline output."""
        async for token in self.pipeline.run_stream(query, context, setting, conversation_history):
            yield token


    async def delete_document(
        self, file_id: str, context: RagContext, setting: WorkspaceSetting
    ) -> None:
        """Remove all chunks for a file_id from the vector store."""
        rag_config = _setting_to_rag_config(setting)
        await self.vectorstores.delete_document(rag_config, file_id)

    async def get_document(
        self, file_id: str, context: RagContext, setting: WorkspaceSetting
    ) -> list[Chunk]:
        """Fetch all chunks associated with a document (alias for vectorstore access)."""
        rag_config = _setting_to_rag_config(setting)
        # Note: mapping RetrievedChunk to Chunk if needed
        return await self.vectorstores.get_document_chunks(rag_config, file_id)