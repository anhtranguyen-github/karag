from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable, Sequence

from app.core.events import EventEnvelope


Subscriber = Callable[[EventEnvelope], None]


@dataclass(slots=True)
class StoredObject:
    path: str
    size_bytes: int
    content_type: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class StoredVector:
    id: str
    values: list[float]
    payload: dict[str, Any]


@dataclass(slots=True)
class VectorSearchResult:
    id: str
    score: float
    payload: dict[str, Any]


@dataclass(slots=True)
class ChatMessage:
    role: str
    content: str


@dataclass(slots=True)
class ChatCompletion:
    model: str
    content: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int


class VectorStore(ABC):
    name: str

    @abstractmethod
    def upsert_embeddings(
        self,
        collection: str,
        records: Sequence[StoredVector],
    ) -> None:
        raise NotImplementedError

    @abstractmethod
    def search(
        self,
        collection: str,
        query: str,
        filters: dict[str, str],
        limit: int = 5,
        query_vector: list[float] | None = None,
    ) -> list[VectorSearchResult]:
        raise NotImplementedError

    @abstractmethod
    def delete_by_filters(self, collection: str, filters: dict[str, str]) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_by_filters(self, collection: str, filters: dict[str, str]) -> list[StoredVector]:
        raise NotImplementedError


class StorageProvider(ABC):
    name: str

    @abstractmethod
    def store_object(
        self,
        path: str,
        content: bytes,
        content_type: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> StoredObject:
        raise NotImplementedError

    @abstractmethod
    def get_object(self, path: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def delete_prefix(self, prefix: str) -> None:
        raise NotImplementedError


class EventBus(ABC):
    name: str

    @abstractmethod
    def publish(self, event: EventEnvelope) -> None:
        raise NotImplementedError

    @abstractmethod
    def publish_many(self, events: Iterable[EventEnvelope]) -> None:
        raise NotImplementedError

    @abstractmethod
    def subscribe(self, event_type: str, handler: Subscriber) -> None:
        raise NotImplementedError

    @abstractmethod
    def events(self) -> list[EventEnvelope]:
        raise NotImplementedError


class EmbeddingProvider(ABC):
    name: str

    @abstractmethod
    def embed_texts(self, texts: Sequence[str], model: str | None = None) -> list[list[float]]:
        raise NotImplementedError

    @abstractmethod
    def list_models(self) -> list[str]:
        raise NotImplementedError


class LLMProvider(ABC):
    name: str

    @abstractmethod
    def chat(self, messages: Sequence[ChatMessage], model: str | None = None) -> ChatCompletion:
        raise NotImplementedError

    @abstractmethod
    def list_models(self) -> list[str]:
        raise NotImplementedError
