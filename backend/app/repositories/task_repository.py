from typing import Any

from backend.app.repositories.base_repository import BaseRepository
from backend.app.schemas.task import Task


class TaskRepository(BaseRepository[Task]):
    def __init__(self):
        super().__init__(collection_name="tasks", model_class=Task)

    async def list_by_workspace(
        self, workspace_id: str, task_type: str | None = None, limit: int = 50
    ) -> list[Task]:
        filters = {"workspace_id": workspace_id}
        if task_type:
            filters["type"] = task_type
        
        cursor = self.collection.find(filters).sort("created_at", -1)
        docs = await cursor.to_list(length=limit)
        return [self.model_class.model_validate(self.normalize_id(doc)) for doc in docs]


task_repository = TaskRepository()
