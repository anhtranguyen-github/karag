from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List

from app.rag.schemas.types import ChatMessage, Embedding, RetrievedChunk
from app.rag.schemas.documents import Document
from app.rag.schemas.schemas import FileConfig
from app.rag.schemas.pipeline_models import RAGChunk, RAGDocument


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
    def requirement(self) -> List[str]:
        """Python packages that must be importable at execution time."""

    config: Dict[str, Any] = {}
    """Declarative schema of configuration keys this component reads from
    ``rag_config``.  For introspection/documentation only — not enforced at
    runtime.  Keys are config names, values are type description strings."""

    def validate_environment(self) -> bool:
        """Return ``True`` if every library in ``requirement`` is available."""
        import importlib.util

        for lib in self.requirement:
            pkg = lib.split("==")[0].split(">=")[0].strip()
            if importlib.util.find_spec(pkg) is None:
                return False
        return True

    def model_dump(self) -> dict[str, Any]:
        """Serialise component identity for metadata attachment."""
        return {
            "name": self.name,
            "description": self.description,
            "requirement": self.requirement,
        }


# ── Readers ──────────────────────────────────────────────


class BaseReader(BaseComponent, ABC):
    """Parse raw file content into one or more ``Document`` objects."""

    @abstractmethod
    async def read(self, content_bytes: bytes, file_config: FileConfig, rag_config: dict[str, Any]) -> list[Document]:
        """Return a list of Documents extracted from content_bytes (asynchronously)."""


# ── Chunkers ─────────────────────────────────────────────


class BaseChunker(BaseComponent, ABC):
    """Split RAG documents into chunks."""

    @abstractmethod
    async def chunk(self, documents: list[RAGDocument], rag_config: dict[str, Any]) -> list[RAGDocument]:
        """Split documents into chunks (asynchronously)."""


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
    """Transform a user query (e.g. HyDE, multi-query expansion) before retrieval."""

    @abstractmethod
    async def transform(self, query: str, rag_config: dict[str, Any]) -> list[str]:
        """Return a list of expanded queries (at least one)."""

class BaseSelfQueryProcessor(BaseComponent, ABC):
    """Analyze query and extract metadata filters (Self-Querying)."""

    @abstractmethod
    async def process_query(self, query: str, rag_config: dict[str, Any]) -> dict[str, Any]:
        """Return a dict of metadata filters extracted from the query."""



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


# ── Inference ───────────────────────────────────────────


class BaseInference(BaseComponent, ABC):
    """Generate an answer (inference) from chat context."""

    @abstractmethod
    async def infer(
        self,
        messages: list[ChatMessage],
        rag_config: dict[str, Any],
    ) -> str:
        """Return a complete answer string."""

    @abstractmethod
    async def infer_stream(
        self,
        messages: list[ChatMessage],
        rag_config: dict[str, Any],
    ) -> AsyncGenerator[str, None]:
        """Yield answer tokens as an async stream."""
        yield ""  # type: ignore[misc]

# ── Safety & Guardrails ──────────────────────────────────


class BaseMasker(BaseComponent, ABC):
    """Detect and redact PII/sensitive info."""

    @abstractmethod
    async def mask(self, text: str, rag_config: dict[str, Any]) -> tuple[str, list[PIISpan]]:
        """Return (redacted_text, list_of_spans)."""


class BaseGuardrail(BaseComponent, ABC):
    """Verify safety, modularity, or faithfulness."""

    @abstractmethod
    async def check(self, text: str, rag_config: dict[str, Any]) -> bool:
        """Return True if safe/valid, False otherwise."""

