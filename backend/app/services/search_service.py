import structlog
from typing import List, Dict, Any, Optional
from backend.app.core.mongodb import mongodb_manager

logger = structlog.get_logger(__name__)

class SearchService:
    @staticmethod
    async def global_search(query: str, workspace_id: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """
        Global search across workspaces, threads, and documents.
        """
        db = mongodb_manager.get_async_database()
        results = {
            "workspaces": [],
            "threads": [],
            "documents": []
        }
        
        if not query or len(query.strip()) < 2:
            return results

        # 1. Search Workspaces (Global)
        workspace_cursor = db.workspaces.find({
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"id": {"$regex": query, "$options": "i"}}
            ]
        }).limit(5)
        
        async for ws in workspace_cursor:
            results["workspaces"].append({
                "id": ws["id"],
                "name": ws["name"],
                "description": ws.get("description", "")
            })

        # 2. Search Threads
        thread_filter = {
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"tags": {"$regex": query, "$options": "i"}}
            ]
        }
        if workspace_id:
            thread_filter["workspace_id"] = workspace_id
            
        thread_cursor = db["thread_metadata"].find(thread_filter).limit(10)
        async for thread in thread_cursor:
            results["threads"].append({
                "id": thread["thread_id"],
                "title": thread["title"],
                "workspace_id": thread["workspace_id"],
                "tags": thread.get("tags", [])
            })

        # 3. Search Documents
        doc_filter = {
            "filename": {"$regex": query, "$options": "i"}
        }
        if workspace_id:
            doc_filter["workspace_id"] = workspace_id
            
        doc_cursor = db.documents.find(doc_filter).limit(10)
        async for doc in doc_cursor:
            results["documents"].append({
                "id": str(doc["_id"]),
                "name": doc["filename"],
                "workspace_id": doc["workspace_id"],
                "extension": doc.get("extension", ""),
                "status": doc.get("status", "ready")
            })

        return results

search_service = SearchService()
