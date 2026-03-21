from __future__ import annotations

import logging
from typing import Any, Optional

from app.core.rag.components.base import BaseReader
from app.core.rag.documents import Document, create_document
from app.core.rag.schemas import FileConfig

logger = logging.getLogger(__name__)


class DoclingReader(BaseReader):
    """AI-powered document converter using IBM Docling."""

    name = "docling"
    description = "AI-powered document converter for various formats (PDF, DOCX, HTML)."
    requires_library = ["docling"]
    config = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass

    def check_dependencies(self) -> None:
        import importlib.util

        if importlib.util.find_spec("docling") is None:
            raise RuntimeError("Missing dependency: docling")

    def read(self, file_config: FileConfig, rag_config: dict[str, Any]) -> list[Document]:
        from docling.document_converter import DocumentConverter
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        import tempfile
        import os

        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = True
        pipeline_options.do_table_structure = True
        converter = DocumentConverter(pipeline_options=pipeline_options)

        content: Any = file_config.content
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                if isinstance(content, bytes):
                    tmp.write(content)
                else:
                    tmp.write(str(content).encode("utf-8"))
                tmp_path = tmp.name

            result = converter.convert(tmp_path)
            raw_text = result.document.export_to_markdown()
            return [create_document(raw_text, file_config)]
        except Exception as e:
            logger.error("Docling conversion failed: %s", e)
            raise RuntimeError(f"Docling conversion failed: {e}") from e
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)