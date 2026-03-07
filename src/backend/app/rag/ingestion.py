import os
import time
import uuid
from pathlib import Path
from typing import Any

import structlog
from langchain_community.document_loaders import (
    Docx2txtLoader,
    PyPDFLoader,
    TextLoader,
)
from src.backend.app.core.factory import ProviderFactory
from src.backend.app.observability import (
    DOCUMENT_INGESTION_COUNT,
    DOCUMENT_INGESTION_LATENCY,
    get_tracer,
)
from src.backend.app.rag.rag_service import rag_service
from src.backend.app.rag.runtime import rag_pipeline_resolver
from src.backend.app.rag.store.base import DocumentPoint
from src.backend.app.schemas.database import IngestionConfig

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class IngestionPipeline:
    def __init__(self):
        pass

    async def get_ingestion_config(
        self, workspace_id: str, dataset_id: str | None = None
    ) -> tuple[IngestionConfig, Any]:
        """Get the ingestion config and the store instance for the workspace or dataset."""
        pipeline = await rag_pipeline_resolver.resolve(workspace_id, dataset_id=dataset_id)
        config = pipeline.to_ingestion_config()
        store = await ProviderFactory.get_vector_store(workspace_id)
        return config, store

    async def initialize(self, workspace_id: str = "default"):
        """Ensure the workspace's target collection exists."""
        config, store = await self.get_ingestion_config(workspace_id)
        await store.create_collection_if_not_exists(config)
        return config.collection_name_override or f"knowledge_base_{config.vector_size}"

    async def process_file(self, file_path_str: str, metadata: dict = None, dataset_id: str | None = None):
        """
        Process various file types: PDF, TXT, MD, DOCX, HTML.
        Automatically selects the appropriate loader based on extension.

        INTERNAL ONLY: file_path_str must be a trusted internal path (e.g. from tempfile or storage).
        Validated against workspace sandbox roots.
        """
        from langchain_community.document_loaders import BSHTMLLoader
        from src.backend.app.core.path_utils import validate_safe_path

        # Canonicalize and validate path
        file_path = validate_safe_path(file_path_str)
        ext = file_path.suffix.lower()

        workspace_id = (metadata or {}).get("workspace_id", "default")
        filename = (metadata or {}).get("filename", file_path.name)

        with tracer.start_as_current_span(
            "ingestion.process_file",
            attributes={
                "ingestion.filename": filename,
                "ingestion.extension": ext,
                "workspace_id": workspace_id,
            },
        ) as span:
            pipeline_start = time.perf_counter()

            config, store = await self.get_ingestion_config(workspace_id, dataset_id=dataset_id)

            doc_id = (metadata or {}).get("doc_id")
            task_id = (metadata or {}).get("task_id")
            from src.backend.app.services.task.task_service import task_service

            if doc_id:
                from src.backend.app.core.mongodb import mongodb_manager

                db = mongodb_manager.get_async_database()
                await db.documents.update_one(
                    {"id": doc_id},
                    {
                        "$set": {
                            "status": "reading",
                            f"workspace_statuses.{workspace_id}": "reading",
                        }
                    },
                )

            if task_id:
                await task_service.update_task(task_id, progress=20, message=f"Reading file: {filename}")

            # --- Component 1: Load ---
            load_start = time.perf_counter()
            if ext == ".pdf":
                loader = PyPDFLoader(str(file_path))
            elif ext in [
                ".txt",
                ".log",
                ".md",
                ".py",
                ".js",
                ".ts",
                ".tsx",
                ".json",
                ".yaml",
                ".yml",
            ]:
                loader = TextLoader(str(file_path))
            elif ext == ".docx":
                loader = Docx2txtLoader(str(file_path))
            elif ext == ".html":
                loader = BSHTMLLoader(str(file_path))
            else:
                raise ValueError(f"Unsupported file extension: {ext}")

            documents = loader.load()
            load_duration = time.perf_counter() - load_start
            DOCUMENT_INGESTION_LATENCY.labels(extension=ext, stage="load").observe(load_duration)

            span.set_attribute("ingestion.pages_loaded", len(documents))
            logger.info(
                "ingestion_load_complete",
                filename=filename,
                pages=len(documents),
                duration_ms=round(load_duration * 1000, 2),
            )

            if task_id:
                await task_service.update_task(
                    task_id,
                    progress=40,
                    message=f"Chunking text ({len(documents)} pages loaded)...",
                )

            # --- Component 2: Chunk ---
            chunk_start = time.perf_counter()
            full_text = "\n\n".join([doc.page_content for doc in documents])
            all_chunks = await rag_service.chunk_text(full_text, workspace_id=workspace_id)

            if not all_chunks:
                DOCUMENT_INGESTION_COUNT.labels(extension=ext, status="empty").inc()
                return 0

            chunk_duration = time.perf_counter() - chunk_start
            DOCUMENT_INGESTION_LATENCY.labels(extension=ext, stage="chunk").observe(chunk_duration)

            span.set_attribute("ingestion.num_chunks", len(all_chunks))
            if task_id:
                await task_service.update_task(
                    task_id,
                    progress=50,
                    message=f"Created {len(all_chunks)} chunks. Generating embeddings...",
                )

            if task_id:
                await task_service.update_task(
                    task_id,
                    progress=60,
                    message=f"Generating embeddings for {len(all_chunks)} chunks (this may take a while)...",
                )

            # --- Component 3: Embed ---
            embed_start = time.perf_counter()
            embeddings = await rag_service.get_embeddings(all_chunks, workspace_id=workspace_id)
            embed_duration = time.perf_counter() - embed_start
            DOCUMENT_INGESTION_LATENCY.labels(extension=ext, stage="embed").observe(embed_duration)

            span.set_attribute("ingestion.embed_duration_ms", round(embed_duration * 1000, 2))

            if task_id:
                await task_service.update_task(
                    task_id,
                    progress=90,
                    message="Storing embeddings and finishing up...",
                )

            # --- Component 4: Store ---
            store_start = time.perf_counter()

            points = []
            for i, chunk in enumerate(all_chunks):
                payload = {
                    **(metadata or {}),
                    "text": chunk,
                    "source": (metadata or {}).get("filename") or file_path.name,
                    "extension": ext,
                    "index": i,
                    "workspace_id": workspace_id,
                    "dataset_id": dataset_id,
                    "shared_with": (metadata or {}).get("shared_with", []),
                    "doc_id": (metadata or {}).get("doc_id"),
                    "version": (metadata or {}).get("version"),
                    "minio_path": (metadata or {}).get("minio_path"),
                    "content_hash": (metadata or {}).get("content_hash"),
                }
                points.append(DocumentPoint(id=str(uuid.uuid4()), vector=embeddings[i], payload=payload))

            await store.upsert_documents(config=config, points=points)

            store_duration = time.perf_counter() - store_start
            DOCUMENT_INGESTION_LATENCY.labels(extension=ext, stage="store").observe(store_duration)

            # --- Component 5: Graph Construction (Optional) ---
            from src.backend.app.core.settings_manager import settings_manager

            settings = await settings_manager.get_settings(workspace_id)
            if settings.rag_engine == "graph":
                from src.backend.app.services.graph_service import graph_service

                # Use the first ~20,000 characters to extract core graph entities/relations efficiently
                sample_text = "\n".join([doc.page_content for doc in documents])[:20000]
                await graph_service.extract_and_store_graph(sample_text, workspace_id)

            # --- Pipeline Summary ---
            total_duration = time.perf_counter() - pipeline_start
            DOCUMENT_INGESTION_LATENCY.labels(extension=ext, stage="total").observe(total_duration)
            DOCUMENT_INGESTION_COUNT.labels(extension=ext, status="success").inc()

            span.set_attribute("ingestion.total_duration_ms", round(total_duration * 1000, 2))

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

    async def process_text(self, text: str, metadata: dict = None, dataset_id: str | None = None):
        """Process raw text: chunk, embed, and store."""
        workspace_id = (metadata or {}).get("workspace_id", "default")

        with tracer.start_as_current_span(
            "ingestion.process_text",
            attributes={
                "ingestion.text_length": len(text),
                "workspace_id": workspace_id,
            },
        ):
            config, store = await self.get_ingestion_config(workspace_id, dataset_id=dataset_id)

            chunks = await rag_service.chunk_text(text, workspace_id=workspace_id)
            embeddings = await rag_service.get_embeddings(chunks, workspace_id=workspace_id)

            points = []
            for i, chunk in enumerate(chunks):
                payload = {
                    **(metadata or {}),
                    "text": chunk,
                    "index": i,
                    "workspace_id": workspace_id,
                    "dataset_id": dataset_id,
                    "shared_with": (metadata or {}).get("shared_with", []),
                }
                points.append(DocumentPoint(id=str(uuid.uuid4()), vector=embeddings[i], payload=payload))

            await store.upsert_documents(config=config, points=points)

            # Optional Graph Extraction
            from src.backend.app.core.settings_manager import settings_manager

            settings = await settings_manager.get_settings(workspace_id)
            if settings.rag_engine == "graph":
                from src.backend.app.services.graph_service import graph_service

                await graph_service.extract_and_store_graph(text, workspace_id)

            return len(chunks)

    async def process_url(self, url: str, metadata: dict = None, dataset_id: str | None = None):
        """
        Process a web URL using WebBaseLoader.
        """
        from langchain_community.document_loaders import WebBaseLoader

        workspace_id = (metadata or {}).get("workspace_id", "default")

        with tracer.start_as_current_span(
            "ingestion.process_url",
            attributes={
                "ingestion.url": url,
                "workspace_id": workspace_id,
            },
        ) as span:
            pipeline_start = time.perf_counter()
            config, store = await self.get_ingestion_config(workspace_id, dataset_id=dataset_id)

            # --- Component 1: Load ---
            loader = WebBaseLoader(url)
            documents = loader.load()

            span.set_attribute("ingestion.pages_loaded", len(documents))

            # --- Component 2: Chunk ---
            all_chunks = []
            for doc in documents:
                chunks = await rag_service.chunk_text(doc.page_content, workspace_id=workspace_id)
                all_chunks.extend(chunks)

            if not all_chunks:
                return 0

            # --- Component 3: Embed ---
            embeddings = await rag_service.get_embeddings(all_chunks, workspace_id=workspace_id)

            # --- Component 4: Store ---
            points = []
            for i, chunk in enumerate(all_chunks):
                payload = {
                    **(metadata or {}),
                    "text": chunk,
                    "source": url,
                    "extension": ".html",
                    "index": i,
                    "workspace_id": workspace_id,
                    "dataset_id": dataset_id,
                }
                points.append(DocumentPoint(id=str(uuid.uuid4()), vector=embeddings[i], payload=payload))

            await store.upsert_documents(config=config, points=points)

            total_duration = time.perf_counter() - pipeline_start
            logger.info(
                "ingestion_url_complete",
                url=url,
                chunks=len(all_chunks),
                total_ms=round(total_duration * 1000, 2),
            )
            return len(all_chunks)

    async def process_sitemap(self, sitemap_url: str, metadata: dict = None):
        """
        Process all URLs in a sitemap.
        """
        from langchain_community.document_loaders.sitemap import SitemapLoader

        workspace_id = (metadata or {}).get("workspace_id", "default")

        with tracer.start_as_current_span(
            "ingestion.process_sitemap",
            attributes={
                "ingestion.sitemap_url": sitemap_url,
                "workspace_id": workspace_id,
            },
        ) as span:
            # Note: SitemapLoader is synchronous and can be slow
            loader = SitemapLoader(sitemap_url)
            documents = loader.load()

            span.set_attribute("ingestion.urls_found", len(documents))
            logger.info("ingestion_sitemap_loaded", url=sitemap_url, count=len(documents))

            total_chunks = 0
            for doc in documents:
                # We reuse process_text for each page to handle chunking/embedding/storing
                chunks = await self.process_text(
                    doc.page_content,
                    metadata={
                        **(metadata or {}),
                        "source": doc.metadata.get("source", sitemap_url),
                        "title": doc.metadata.get("title", ""),
                    },
                )
                total_chunks += chunks

            return total_chunks

    async def _ingest_local_directory(self, directory_path: Path, metadata: dict = None):
        """
        INTERNAL ONLY: Recursively process files in a system-controlled directory.
        Used by GitHub ingestion and other internal workflows.
        """
        from src.backend.app.core.path_utils import validate_safe_path

        # Strictly sandbox the directory path
        directory_path = validate_safe_path(directory_path)

        ignore_dirs = {".git", "__pycache__", ".venv", "node_modules", ".next"}
        total_chunks = 0

        for root, dirs, files in os.walk(str(directory_path)):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            for file in files:
                if file.startswith("."):
                    continue
                file_path = Path(root) / file
                try:
                    # process_file will also validate each individual file path
                    chunks = await self.process_file(str(file_path), metadata=metadata)
                    total_chunks += chunks
                except Exception:
                    logger.warning("ingestion_file_failed", file_path=str(file_path))
                    continue
        return total_chunks


ingestion_pipeline = IngestionPipeline()
