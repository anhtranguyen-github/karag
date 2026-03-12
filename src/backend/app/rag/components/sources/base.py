from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from app.rag.components.base import BaseComponent

@dataclass
class FileMeta:
    path: str
    size_bytes: int
    name: str = ""
    mime_type: str = "application/octet-stream"

class BaseSource(BaseComponent, ABC):
    """Base class for all data sources in the RAG pipeline."""

    @abstractmethod

    @abstractmethod
    async def initialize(self) -> None:
        """Lazy load resources or perform async initialization."""

    @abstractmethod
    async def list_files(self, context: Any, config: dict[str, Any]) -> list[FileMeta]:
        """List files available from this source."""

    @abstractmethod
    async def get_file(self, context: Any, file_meta: FileMeta) -> bytes | Any:
        """Fetch the contents of a specific file."""
