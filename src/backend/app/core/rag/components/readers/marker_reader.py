from __future__ import annotations

import logging
from typing import Any

from app.core.rag.components.base import BaseReader
from app.core.rag.documents import Document, create_document
from app.core.rag.schemas import FileConfig

logger = logging.getLogger(__name__)


class MarkerReader(BaseReader):
    """High-accuracy PDF-to-Markdown conversion using Marker."""

    name = "marker"
    description = "High-accuracy PDF-to-Markdown conversion using depth models."
    requires_library = ["marker-pdf"]
    config = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass

    def check_dependencies(self) -> None:
        import importlib.util

        if importlib.util.find_spec("marker") is None:
            raise RuntimeError("Missing dependency: marker-pdf")

    def read(self, file_config: FileConfig, rag_config: dict[str, Any]) -> list[Document]:
        import os
        import tempfile

        from marker.converters.pdf import PdfConverter
        from marker.models import create_model_dict
        from marker.output import text_from_rendered

        converter = PdfConverter(artifact_dict=create_model_dict())

        content = file_config.content
        if not content:
            return [create_document("", file_config)]

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tf:
                if isinstance(content, bytes):
                    tf.write(content)
                else:
                    tf.write(str(content).encode("utf-8"))
                temp_path = tf.name

            rendered = converter(temp_path)
            full_text, _, _ = text_from_rendered(rendered)
            return [create_document(full_text, file_config)]
        except Exception as e:
            logger.error("Marker conversion failed: %s", e)
            raise RuntimeError(f"Marker conversion failed: {e}") from e
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
