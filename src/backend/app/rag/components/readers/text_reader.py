from __future__ import annotations
from typing import Any

from app.rag.components.base import BaseReader
from app.rag.schemas.documents import Document
from app.rag.schemas.schemas import FileConfig

class TextReader(BaseReader):
    """Simple reader for plain text and markdown files."""

    name = "text"
    description = "Simple reader for plain text and markdown files."
    requirement = []
    config = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass

    async def read(self, content_bytes: bytes, file_config: FileConfig, rag_config: dict[str, Any]) -> list[Document]:
        if not isinstance(content_bytes, (bytes, bytearray)):
            raise TypeError("TextReader expects bytes content.")

        try:
            raw_text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            # Fallback to latin-1 if utf-8 fails
            raw_text = content_bytes.decode("latin-1")
        
        return [Document(
            file_id=file_config.file_id,
            content=raw_text,
            title=file_config.filename,
            source=file_config.source,
            labels=file_config.labels_json,
            metadata={
                "extension": file_config.extension,
                "file_size": file_config.file_size,
            }
        )]
