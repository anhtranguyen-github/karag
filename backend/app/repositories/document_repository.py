from typing import Any

from backend.app.repositories.base_repository import BaseRepository
from backend.app.schemas.documents import DocumentResponse


class DocumentRepository(BaseRepository[DocumentResponse]):
    def __init__(self):
        super().__init__(collection_name="documents", model_class=DocumentResponse)

    async def list_by_workspace(self, workspace_id: str, limit: int = 1000) -> list[DocumentResponse]:
        doc_cursor = self.collection.find({"workspace_id": workspace_id})
        docs = await doc_cursor.to_list(length=limit)
        return [self.model_class.model_validate(self.normalize_id(doc)) for doc in docs]


    async def find_by_hash(self, content_hash: str) -> DocumentResponse | None:
        doc = await self.collection.find_one({"content_hash": content_hash})
        if not doc:
            return None
        return self.model_class.model_validate(self.normalize_id(doc))


document_repository = DocumentRepository()
