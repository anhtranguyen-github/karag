from typing import List, Dict, Optional
from backend.app.core.mongodb import mongodb_manager

class QueryService:
    async def list_by_workspace(self, workspace_id: str) -> List[Dict]:
        db = mongodb_manager.get_async_database()
        cursor = db.documents.find({
            "$or": [
                {"workspace_id": workspace_id},
                {"shared_with": workspace_id}
            ]
        })
        all_docs = await cursor.to_list(length=200)
        for d in all_docs:
            if d.get("shared_with") and workspace_id in d["shared_with"]:
                d["is_shared"] = True
            if "_id" in d:
                d["_id"] = str(d["_id"])
            d["name"] = d.get("filename")
        return all_docs

    async def list_all(self) -> List[Dict]:
        db = mongodb_manager.get_async_database()
        cursor = db.documents.find()
        docs = await cursor.to_list(length=1000)
        
        ws_cursor = db.workspaces.find({}, {"id": 1, "name": 1})
        workspaces = await ws_cursor.to_list(length=1000)
        ws_map = {ws.get("id", ""): ws.get("name", "Unknown") for ws in workspaces if ws.get("id")}
        
        for d in docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
            d["name"] = d.get("filename")
            d["workspace_name"] = ws_map.get(d.get("workspace_id", ""), "Unknown Workspace")
        return docs

    async def list_vault(self) -> List[Dict]:
        db = mongodb_manager.get_async_database()
        pipeline = [
            {"$sort": {"updated_at": -1}},
            {
                "$group": {
                    "_id": "$content_hash",
                    "doc": {"$first": "$$ROOT"}
                }
            },
            {"$replaceRoot": {"newRoot": "$doc"}}
        ]
        cursor = db.documents.aggregate(pipeline)
        docs = await cursor.to_list(length=1000)
        
        ws_cursor = db.workspaces.find({}, {"id": 1, "name": 1})
        workspaces = await ws_cursor.to_list(length=1000)
        ws_map = {ws.get("id", ""): ws.get("name", "Unknown") for ws in workspaces if ws.get("id")}

        for d in docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
            d["name"] = d.get("filename")
            d["workspace_name"] = ws_map.get(d.get("workspace_id", ""), "Unknown Workspace")
        return docs

    async def get_by_id_or_name(self, name: str) -> Optional[Dict]:
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({
            "$or": [
                {"id": name},
                {"filename": name}
            ]
        })
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def get_chunks(self, name: str, limit: int = 100) -> List[Dict]:
        from backend.app.rag.qdrant_provider import qdrant
        from backend.app.core.settings_manager import settings_manager

        doc = await self.get_by_id_or_name(name)
        if not doc:
            return []
        
        ws_id = doc.get("workspace_id")
        settings = await settings_manager.get_settings(ws_id)
        collection = qdrant.get_collection_name(settings.embedding_dim)
        
        results = await qdrant.client.scroll(
            collection_name=collection,
            scroll_filter={"must": [{"key": "source_name", "match": {"value": doc["filename"]}}]},
            limit=limit,
            with_payload=True,
            with_vectors=False
        )
        return [{"id": p.id, **p.payload} for p in results[0]]

    async def inspect(self, name: str) -> Dict:
        doc = await self.get_by_id_or_name(name)
        if not doc:
            return {"error": "Not found"}

        from backend.app.core.settings_manager import settings_manager
        settings = await settings_manager.get_settings(doc["workspace_id"])
        
        from backend.app.rag.qdrant_provider import qdrant
        collection = qdrant.get_collection_name(settings.embedding_dim)
        
        count_res = await qdrant.client.count(
            collection_name=collection,
            count_filter={"must": [{"key": "source_name", "match": {"value": doc["filename"]}}]}
        )
        
        return {
            "metadata": doc,
            "rag": {
                "collection": collection,
                "chunk_count": count_res.count,
                "settings": settings.model_dump()
            }
        }
