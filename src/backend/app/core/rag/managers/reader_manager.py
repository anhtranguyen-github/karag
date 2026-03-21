from __future__ import annotations

import logging
import time
from typing import Any, Type

from app.core.rag.components.base import BaseReader
from app.core.rag.components.readers.docling_reader import DoclingReader
from app.core.rag.components.readers.marker_reader import MarkerReader
from app.core.rag.components.readers.simple_pdf_reader import SimplePdfReader
from app.core.rag.documents import Document
from app.core.rag.schemas import FileConfig

logger = logging.getLogger(__name__)


class ReaderManager:
    """Orchestrator for reader components."""

    def __init__(self) -> None:
        self.readers: dict[str, Type[BaseReader]] = {
            "docling": DoclingReader,
            "marker": MarkerReader,
            "simple_pdf": SimplePdfReader,
        }

    def available_components(self) -> list[str]:
        return list(self.readers.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseReader:
        name = rag_config.get("rag", {}).get("reader", "")
        if name not in self.readers:
            raise ValueError(f"Reader '{name}' not registered. Available: {list(self.readers.keys())}")
        component = self.readers[name](rag_config)
        component.check_dependencies()
        return component

    def process(
        self,
        rag_config: dict[str, Any],
        file_config: FileConfig,
    ) -> list[Document]:
        """Read file_config into Documents, attach component metadata."""
        reader = self.resolve(rag_config)
        logger.info("Reader [%s] starting for %s", reader.name, file_config.filename)
        start = time.perf_counter()

        documents = reader.read(file_config, rag_config)

        elapsed = time.perf_counter() - start
        for doc in documents:
            doc.meta["Reader"] = {**reader.model_dump(), "elapsed_ms": int(elapsed * 1000)}
        logger.info("Reader [%s] produced %d document(s) in %.1fms", reader.name, len(documents), elapsed * 1000)
        return documents
