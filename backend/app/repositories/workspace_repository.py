from backend.app.repositories.base_repository import BaseRepository
from backend.app.schemas.workspace import Workspace


class WorkspaceRepository(BaseRepository[Workspace]):
    def __init__(self):
        super().__init__(collection_name="workspaces", model_class=Workspace)

    async def find_by_name(self, name: str) -> Workspace | None:
        doc = await self.collection.find_one({"name": name})
        if not doc:
            return None
        return self.model_class.model_validate(self.normalize_id(doc))

    async def list_by_owner(self, owner_id: str) -> list[Workspace]:
        # Using aggregation as in the original service for stats
        pipeline = [
            {"$match": {"owner_id": owner_id}},
            {
                "$lookup": {
                    "from": "documents",
                    "localField": "id",
                    "foreignField": "workspace_id",
                    "as": "docs",
                }
            },
            {
                "$lookup": {
                    "from": "thread_metadata",
                    "localField": "id",
                    "foreignField": "workspace_id",
                    "as": "threads",
                }
            },
            {
                "$lookup": {
                    "from": "workspace_settings",
                    "localField": "id",
                    "foreignField": "workspace_id",
                    "as": "settings",
                }
            },
            {"$addFields": {"settings_doc": {"$arrayElemAt": ["$settings", 0]}}},
            {
                "$project": {
                    "id": 1,
                    "name": 1,
                    "description": 1,
                    "created_at": 1,
                    "updated_at": 1,
                    "rag_engine": "$settings_doc.rag_engine",
                    "stats": {
                        "doc_count": {"$size": "$docs"},
                        "thread_count": {"$size": "$threads"},
                    },
                }
            },
        ]
        docs = await self.collection.aggregate(pipeline).to_list(1000)
        return [self.model_class.model_validate(self.normalize_id(doc)) for doc in docs]


workspace_repository = WorkspaceRepository()
