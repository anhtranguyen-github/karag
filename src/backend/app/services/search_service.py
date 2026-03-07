from typing import Any

import structlog
from src.backend.app.core.mongodb import mongodb_manager
from src.backend.app.repositories.document_repository import document_repository
from src.backend.app.repositories.thread_repository import thread_repository
from src.backend.app.repositories.workspace_repository import workspace_repository

logger = structlog.get_logger(__name__)


class SearchService:
    @staticmethod
    async def global_search(query: str, workspace_id: str) -> dict[str, list[dict[str, Any]]]:
        """
        Global search across workspaces, threads, and documents.
        """
        db = mongodb_manager.get_async_database()
        results = {"workspaces": [], "threads": [], "documents": []}

        if not query or len(query.strip()) < 2:
            return results

        # 1. Search Workspaces (Global)
        workspace_cursor = workspace_repository.collection.find(
            {
                "id": workspace_id,
                "$or": [
                    {"name": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}},
                ],
            }
        ).limit(1)

        async for ws in workspace_cursor:
            results["workspaces"].append(
                {
                    "id": ws["id"],
                    "name": ws["name"],
                    "description": ws.get("description", ""),
                }
            )

        # 2. Search Threads
        thread_filter = {
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"tags": {"$regex": query, "$options": "i"}},
            ]
        }
        thread_filter["workspace_id"] = workspace_id

        thread_cursor = thread_repository.collection.find(thread_filter).limit(10)
        async for thread in thread_cursor:
            results["threads"].append(
                {
                    "id": thread["thread_id"],
                    "title": thread["title"],
                    "workspace_id": thread["workspace_id"],
                    "tags": thread.get("tags", []),
                }
            )

        # 3. Search Documents
        doc_filter = {"filename": {"$regex": query, "$options": "i"}}
        doc_filter["workspace_id"] = workspace_id

        doc_cursor = document_repository.collection.find(doc_filter).limit(10)
        async for doc in doc_cursor:
            results["documents"].append(
                {
                    "id": str(doc["_id"]),
                    "name": doc["filename"],
                    "workspace_id": doc["workspace_id"],
                    "extension": doc.get("extension", ""),
                    "status": doc.get("status", "ready"),
                }
            )

        return results


search_service = SearchService()

