from src.backend.app.repositories.base_repository import BaseRepository
from src.backend.app.schemas.chat import ThreadMetadata


class ThreadRepository(BaseRepository[ThreadMetadata]):
    def __init__(self):
        super().__init__(collection_name="thread_metadata", model_class=ThreadMetadata)

    async def get_by_thread_id(self, thread_id: str) -> ThreadMetadata | None:
        doc = await self.collection.find_one({"thread_id": thread_id})
        if not doc:
            return None
        return self.model_class.model_validate(self.normalize_id(doc))

    async def list_by_workspace(self, workspace_id: str, limit: int = 100) -> list[ThreadMetadata]:
        cursor = self.collection.find({"workspace_id": workspace_id}).sort([("updated_at", -1), ("_id", -1)]).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self.model_class.model_validate(self.normalize_id(doc)) for doc in docs]

thread_repository = ThreadRepository()

