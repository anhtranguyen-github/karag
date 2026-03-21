from __future__ import annotations

from typing import Any

from app.core.rag.components.base import BaseReader
from app.core.rag.documents import Document, create_document
from app.core.rag.schemas import FileConfig


class SimplePdfReader(BaseReader):
    """Minimal PDF reader using pypdf."""

    name = "simple_pdf"
    description = "Minimal PDF reader using pypdf for quick pipeline debugging."
    requires_library = ["pypdf"]
    config = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass

    def check_dependencies(self) -> None:
        pass

    def read(self, file_config: FileConfig, rag_config: dict[str, Any]) -> list[Document]:
        from io import BytesIO
        from pypdf import PdfReader

        content = file_config.content
        if isinstance(content, str):
            content = content.encode("utf-8")
        if not isinstance(content, (bytes, bytearray)):
            raise TypeError("SimplePdfReader expects bytes content for PDFs.")

        reader = PdfReader(BytesIO(bytes(content)))
        pages: list[str] = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        raw_text = "\n\n".join(p.strip() for p in pages if p.strip())
        return [create_document(raw_text, file_config)]