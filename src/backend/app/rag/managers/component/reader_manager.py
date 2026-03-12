from __future__ import annotations

import logging
import time
from typing import Any, Type, TYPE_CHECKING

from app.rag.components.base import BaseReader

from app.rag.schemas.documents import Document
from app.rag.schemas.schemas import FileConfig


logger = logging.getLogger(__name__)

class ReaderManager:
    """Orchestrator for reader components with lazy loading."""

    def __init__(self) -> None:
        self._reader_map: dict[str, str] = {
            "docling": "app.rag.components.readers.docling_reader.DoclingReader",
            "marker": "app.rag.components.readers.marker_reader.MarkerReader",
            "simple_pdf": "app.rag.components.readers.simple_pdf_reader.SimplePdfReader",
            "text": "app.rag.components.readers.text_reader.TextReader",
        }
        self._cached_classes: dict[str, Type[BaseReader]] = {}

    def _get_reader_class(self, name: str) -> Type[BaseReader]:
        """Lazy load the reader class from its module path."""
        if name in self._cached_classes:
            return self._cached_classes[name]
        
        if name not in self._reader_map:
            raise ValueError(f"Reader '{name}' not registered. Available: {list(self._reader_map.keys())}")
        
        class_path = self._reader_map[name]
        import importlib
        try:
            module_path, class_name = class_path.rsplit(".", 1)
            module = importlib.import_module(module_path)
            cls = getattr(module, class_name)
            self._cached_classes[name] = cls
            return cls
        except ImportError as e:
            logger.error("Failed to load reader '%s': %s", name, e)
            raise RuntimeError(f"Reader '{name}' is unavailable due to missing dependencies: {e}") from e

    def available_components(self) -> list[str]:
        return list(self._reader_map.keys())

    def resolve(self, rag_config: dict[str, Any]) -> BaseReader:
        # Check both legacy and new config path
        name = rag_config.get("reading", {}).get("component")
        if not name:
             name = rag_config.get("rag", {}).get("reader")
        
        if not name:
             # Fallback to default if not specified
             name = "marker"
        
        cls = self._get_reader_class(name)
        return cls(rag_config)

    async def process(
        self,
        rag_config: dict[str, Any],
        file_config: FileConfig,
        content_bytes: bytes,
    ) -> list[Document]:
        """Read content_bytes into Documents using selected component."""
        reader = self.resolve(rag_config)
        logger.info("Reader [%s] starting for %s", reader.name, file_config.filename)
        start = time.perf_counter()

        documents = await reader.read(content_bytes, file_config, rag_config)

        elapsed = time.perf_counter() - start
        for doc in documents:
            doc.metadata["Reader"] = {
                "name": reader.name,
                "elapsed_ms": int(elapsed * 1000)
            }
        logger.info("Reader [%s] produced %d document(s) in %.1fms", reader.name, len(documents), elapsed * 1000)
        return documents
