import time
import uuid
import os
from typing import Dict

import structlog
from backend.app.rag.qdrant_provider import qdrant
from backend.app.rag.rag_service import rag_service
from backend.app.core.telemetry import (
    get_tracer,
    DOCUMENT_INGESTION_LATENCY,
    DOCUMENT_INGESTION_COUNT,
)
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
    Docx2txtLoader,
)

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class IngestionPipeline:
    def __init__(self):
        pass

    async def get_target_collection(self, workspace_id: str) -> tuple:
        """Determine collection name based on workspace embedding dimensions."""
        from backend.app.core.settings_manager import settings_manager

        settings = await settings_manager.get_settings(workspace_id)
        return qdrant.get_collection_name(settings.embedding_dim), settings.embedding_dim

    async def initialize(self, workspace_id: str = "default"):
        """Ensure the workspace's target collection exists."""
        name, dim = await self.get_target_collection(workspace_id)
        await qdrant.create_collection(name, vector_size=dim)
        return name

    async def process_file(self, file_path: str, metadata: Dict = None):
        """
        Process various file types: PDF, TXT, MD, DOCX.
        Automatically selects the appropriate loader based on extension.
        """
        ext = os.path.splitext(file_path)[1].lower()
        workspace_id = (metadata or {}).get("workspace_id", "default")
        filename = (metadata or {}).get("filename", os.path.basename(file_path))

        with tracer.start_as_current_span(
            "ingestion.process_file",
            attributes={
                "ingestion.filename": filename,
                "ingestion.extension": ext,
                "workspace_id": workspace_id,
            },
        ) as span:
            pipeline_start = time.perf_counter()

            target_collection, _ = await self.get_target_collection(workspace_id)

            # --- Stage 1: Load ---
            load_start = time.perf_counter()
            if ext == ".pdf":
                loader = PyPDFLoader(file_path)
            elif ext in [".txt", ".log", ".md"]:
                loader = TextLoader(file_path)
            elif ext == ".docx":
                loader = Docx2txtLoader(file_path)
            else:
                raise ValueError(f"Unsupported file extension: {ext}")

            documents = loader.load()
            load_duration = time.perf_counter() - load_start
            DOCUMENT_INGESTION_LATENCY.labels(
                extension=ext, stage="load"
            ).observe(load_duration)

            span.set_attribute("ingestion.pages_loaded", len(documents))
            logger.info(
                "ingestion_load_complete",
                filename=filename,
                pages=len(documents),
                duration_ms=round(load_duration * 1000, 2),
            )

            # --- Stage 2: Chunk ---
            chunk_start = time.perf_counter()
            all_chunks = []
            for doc in documents:
                chunks = await rag_service.chunk_text(
                    doc.page_content, workspace_id=workspace_id
                )
                all_chunks.extend(chunks)

            if not all_chunks:
                DOCUMENT_INGESTION_COUNT.labels(
                    extension=ext, status="empty"
                ).inc()
                return 0

            chunk_duration = time.perf_counter() - chunk_start
            DOCUMENT_INGESTION_LATENCY.labels(
                extension=ext, stage="chunk"
            ).observe(chunk_duration)

            span.set_attribute("ingestion.num_chunks", len(all_chunks))

            # --- Stage 3: Embed ---
            embed_start = time.perf_counter()
            embeddings = await rag_service.get_embeddings(
                all_chunks, workspace_id=workspace_id
            )
            embed_duration = time.perf_counter() - embed_start
            DOCUMENT_INGESTION_LATENCY.labels(
                extension=ext, stage="embed"
            ).observe(embed_duration)

            span.set_attribute(
                "ingestion.embed_duration_ms", round(embed_duration * 1000, 2)
            )

            # --- Stage 4: Store ---
            store_start = time.perf_counter()
            ids = [str(uuid.uuid4()) for _ in all_chunks]
            payloads = [
                {
                    **(metadata or {}),
                    "text": chunk,
                    "source": (metadata or {}).get("filename")
                    or os.path.basename(file_path),
                    "extension": ext,
                    "index": i,
                    "workspace_id": workspace_id,
                    "shared_with": (metadata or {}).get("shared_with", []),
                    "doc_id": (metadata or {}).get("doc_id"),
                    "version": (metadata or {}).get("version"),
                    "minio_path": (metadata or {}).get("minio_path"),
                    "content_hash": (metadata or {}).get("content_hash"),
                    "rag_config_hash": (metadata or {}).get("rag_config_hash"),
                }
                for i, chunk in enumerate(all_chunks)
            ]

            await qdrant.upsert_documents(
                target_collection, vectors=embeddings, ids=ids, payloads=payloads
            )
            store_duration = time.perf_counter() - store_start
            DOCUMENT_INGESTION_LATENCY.labels(
                extension=ext, stage="store"
            ).observe(store_duration)

            # --- Pipeline Summary ---
            total_duration = time.perf_counter() - pipeline_start
            DOCUMENT_INGESTION_LATENCY.labels(
                extension=ext, stage="total"
            ).observe(total_duration)
            DOCUMENT_INGESTION_COUNT.labels(
                extension=ext, status="success"
            ).inc()

            span.set_attribute(
                "ingestion.total_duration_ms", round(total_duration * 1000, 2)
            )

            logger.info(
                "ingestion_pipeline_complete",
                filename=filename,
                extension=ext,
                chunks=len(all_chunks),
                load_ms=round(load_duration * 1000, 2),
                chunk_ms=round(chunk_duration * 1000, 2),
                embed_ms=round(embed_duration * 1000, 2),
                store_ms=round(store_duration * 1000, 2),
                total_ms=round(total_duration * 1000, 2),
                workspace_id=workspace_id,
            )

            return len(all_chunks)

    async def process_text(self, text: str, metadata: Dict = None):
        """Process raw text: chunk, embed, and store."""
        workspace_id = (metadata or {}).get("workspace_id", "default")

        with tracer.start_as_current_span(
            "ingestion.process_text",
            attributes={
                "ingestion.text_length": len(text),
                "workspace_id": workspace_id,
            },
        ):
            target_collection, _ = await self.get_target_collection(workspace_id)

            chunks = await rag_service.chunk_text(text, workspace_id=workspace_id)
            embeddings = await rag_service.get_embeddings(
                chunks, workspace_id=workspace_id
            )

            ids = [str(uuid.uuid4()) for _ in chunks]
            payloads = [
                {
                    **(metadata or {}),
                    "text": chunk,
                    "index": i,
                    "workspace_id": workspace_id,
                    "shared_with": (metadata or {}).get("shared_with", []),
                }
                for i, chunk in enumerate(chunks)
            ]

            await qdrant.upsert_documents(
                target_collection, vectors=embeddings, ids=ids, payloads=payloads
            )
            return len(chunks)


ingestion_pipeline = IngestionPipeline()
