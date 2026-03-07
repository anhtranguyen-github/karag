from typing import Any, Generic, TypeVar

from src.backend.app.core.mongodb import mongodb_manager
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class BaseRepository(Generic[T]):
    def __init__(self, collection_name: str, model_class: type[T]):
        self.collection_name = collection_name
        self.model_class = model_class

    @property
    def collection(self) -> AsyncIOMotorCollection:
        db = mongodb_manager.get_async_database()
        return db[self.collection_name]

    def normalize_id(self, doc: dict[str, Any] | None) -> dict[str, Any] | None:
        """Centralized MongoDB _id to str conversion."""
        if doc is None:
            return None
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    def normalize_list(self, docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Normalize a list of documents."""
        return [self.normalize_id(doc) for doc in docs]  # type: ignore

    async def get_by_id(self, id_value: Any, id_field: str = "id") -> T | None:
        """Fetch a single document by its custom ID field."""
        doc = await self.collection.find_one({id_field: id_value})
        if not doc:
            return None
        return self.model_class.model_validate(self.normalize_id(doc))

    async def list_all(self, filters: dict[str, Any] | None = None, limit: int = 1000) -> list[T]:
        """List all documents matching optional filters."""
        cursor = self.collection.find(filters or {})
        docs = await cursor.to_list(length=limit)
        return [self.model_class.model_validate(self.normalize_id(doc)) for doc in docs]

    async def create(self, data: dict[str, Any]) -> T:
        """Insert a new document."""
        await self.collection.insert_one(data)
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return self.model_class.model_validate(data)

    async def update(self, id_value: Any, data: dict[str, Any], id_field: str = "id") -> T | None:
        """Update a document by its custom ID field."""
        result = await self.collection.find_one_and_update(
            {id_field: id_value}, {"$set": data}, return_document=True
        )
        if not result:
            return None
        return self.model_class.model_validate(self.normalize_id(result))

    async def delete(self, id_value: Any, id_field: str = "id") -> bool:
        """Delete a document by its custom ID field."""
        result = await self.collection.delete_one({id_field: id_value})
        return result.deleted_count > 0

