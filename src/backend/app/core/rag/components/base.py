from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List

from app.core.rag.types import ChatMessage, Embedding, RetrievedChunk
from app.core.rag.documents import Document
from app.core.rag.schemas import FileConfig
from app.core.rag.pipeline_models import RAGChunk, RAGDocument


class BaseComponent(ABC):
    """Base class for all RAG components.

    Every component is self-contained, config-driven, and dependency-aware.
    Components receive ``rag_config`` (a dict mirroring WorkspaceSetting)
    and resolve all parameters — including secrets — internally.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique registry key for this component."""

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable explanation of the component."""

    @property
    @abstractmethod
    def requires_library(self) -> List[str]:
        """Python packages that must be importable at execution time."""

    config: Dict[str, Any] = {}
    """Declarative schema of configuration keys this component reads from
    ``rag_config``.  For introspection/documentation only — not enforced at
    runtime.  Keys are config names, values are type description strings."""

    @abstractmethod
    def check_dependencies(self) -> None:
        """Raise ``RuntimeError`` when a required library is missing."""

    def validate_environment(self) -> bool:
        """Return ``True`` if every library in ``requires_library`` is available."""
        import importlib.util

        for req in self.requires_library:
            pkg = req.split("==")[0].split(">=")[0].strip()
            if importlib.util.find_spec(pkg) is None:
                return False
        return True

    def model_dump(self) -> dict[str, Any]:
        """Serialise component identity for metadata attachment."""
        return {
            "name": self.name,
            "description": self.description,
            "requires_library": self.requires_library,
        }


# ── Readers ──────────────────────────────────────────────


class BaseReader(BaseComponent, ABC):
    """Parse raw file content into one or more ``Document`` objects."""

    @abstractmethod
    def read(self, file_config: FileConfig, rag_config: dict[str, Any]) -> list[Document]:
        """Return a list of Documents extracted from ``file_config.content``."""


# ── Chunkers ─────────────────────────────────────────────


class BaseChunker(BaseComponent, ABC):
    """Split RAG documents into chunks."""

    @abstractmethod
    def chunk(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        """Populate each document's ``chunks`` list and return the documents."""


# ── Embedders ────────────────────────────────────────────


class BaseEmbedder(BaseComponent, ABC):
    """Vectorise chunk content."""

    @abstractmethod
    async def embed(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        """Populate ``embedded_contexts`` on each chunk and return the documents."""

    @abstractmethod
    async def embed_query(self, query: str, rag_config: dict[str, Any]) -> Embedding:
        """Embed a single query string and return an ``Embedding``."""


# ── VectorStores ─────────────────────────────────────────


class BaseVectorStore(BaseComponent, ABC):
    """Persist and search vectorised chunks."""

    @abstractmethod
    async def store_chunks(
        self, collection_name: str, chunks: list[RAGChunk], context_meta: dict[str, str],
    ) -> None:
        """Persist chunks with their opaque ``embedded_contexts`` into a collection."""

    @abstractmethod
    async def search(
        self,
        collection_name: str,
        query_vector: list[float],
        top_k: int = 5,
        **kwargs: Any,
    ) -> list[RetrievedChunk]:
        """Return the ``top_k`` most similar chunks."""

    @abstractmethod
    async def delete_by_filters(self, filters: dict[str, str]) -> None:
        """Remove all records matching ``filters``."""

    @abstractmethod
    async def list_by_filters(self, filters: dict[str, str]) -> list[Embedding]:
        """List all embeddings matching ``filters``."""


# ── Retrievers ───────────────────────────────────────────


class BaseRetriever(BaseComponent, ABC):
    """Retrieve relevant chunks from a vector store."""

    @abstractmethod
    def set_vectorstore(self, vectorstore: BaseVectorStore) -> None:
        """Accept the vectorstore dependency (injected by RetrieverManager)."""

    @abstractmethod
    async def retrieve(
        self,
        query_embedding: Embedding,
        top_k: int = 5,
        **kwargs: Any,
    ) -> list[RetrievedChunk]:
        """Execute a retrieval query and return ranked chunks."""


# ── Rerankers ────────────────────────────────────────────


class BaseReranker(BaseComponent, ABC):
    """Re-score and reorder retrieved chunks."""

    @abstractmethod
    async def rerank(
        self,
        query: str,
        chunks: list[RetrievedChunk],
        top_k: int = 5,
    ) -> list[RetrievedChunk]:
        """Return a refined ranked list of chunks."""


# ── Query Transformers ───────────────────────────────────


class BaseQueryTransformer(BaseComponent, ABC):
    """Transform a user query before retrieval."""

    @abstractmethod
    async def transform(self, query: str, rag_config: dict[str, Any]) -> str:
        """Return a transformed version of *query*."""


# ── Chat Context ─────────────────────────────────────────


class BaseChatContextManager(BaseComponent, ABC):
    """Build the chat context (messages list) from retrieved chunks + history."""

    @abstractmethod
    def build_context(
        self,
        query: str,
        retrieved_chunks: list[RetrievedChunk],
        conversation_history: list[ChatMessage],
        rag_config: dict[str, Any],
    ) -> list[ChatMessage]:
        """Return structured messages ready for the generator."""


# ── Generators ───────────────────────────────────────────


class BaseGenerator(BaseComponent, ABC):
    """Generate an answer from chat context."""

    @abstractmethod
    async def generate(
        self,
        messages: list[ChatMessage],
        rag_config: dict[str, Any],
    ) -> str:
        """Return a complete answer string."""

    @abstractmethod
    async def generate_stream(
        self,
        messages: list[ChatMessage],
        rag_config: dict[str, Any],
    ) -> AsyncGenerator[str, None]:
        """Yield answer tokens as an async stream."""
        yield ""  # type: ignore[misc]
