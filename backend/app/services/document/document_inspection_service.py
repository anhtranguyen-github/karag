from typing import List, Dict, Optional
from backend.app.core.mongodb import mongodb_manager

class DocumentInspectionService:
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

    async def get_by_id(self, doc_id: str) -> Optional[Dict]:
        """Find a document by its unique internal ID."""
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({"id": doc_id})
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def get_chunks(self, doc_id: str, limit: int = 100) -> List[Dict]:
        """Retrieve vector chunks associated with a specific document ID."""
        from backend.app.rag.qdrant_provider import qdrant
        from backend.app.core.settings_manager import settings_manager

        doc = await self.get_by_id(doc_id)
        if not doc:
            return []
        
        ws_id = doc.get("workspace_id")
        settings = await settings_manager.get_settings(ws_id)
        collection = qdrant.get_collection_name(settings.embedding_dim)
        
        # Filter strictly by doc_id stored in vector payload
        results = await qdrant.client.scroll(
            collection_name=collection,
            scroll_filter={"must": [{"key": "doc_id", "match": {"value": doc_id}}]},
            limit=limit,
            with_payload=True,
            with_vectors=False
        )
        return [{"id": p.id, **p.payload} for p in results[0]]

    async def inspect(self, doc_id: str) -> Dict:
        """Inspect document state and relationships using its internal ID."""
        db = mongodb_manager.get_async_database()
        doc = await self.get_by_id(doc_id)
        if not doc:
            return {"error": "Not found"}

        content_hash = doc.get("content_hash")
        
        cursor = db.documents.find({"content_hash": content_hash})
        related_docs = await cursor.to_list(1000)
        
        ws_cursor = db.workspaces.find({}, {"id": 1, "name": 1})
        workspaces = await ws_cursor.to_list(1000)
        ws_map = {ws.get("id", ""): ws.get("name", "Unknown") for ws in workspaces if ws.get("id")}
        ws_map["vault"] = "Global Vault"
        ws_map["default"] = "Default Workspace"
        
        relationships = []
        zombies_found = False
        
        for d in related_docs:
            ws_id = d["workspace_id"]
            ws_name = ws_map.get(ws_id)
            
            if not ws_name and ws_id != "vault":
                ws_name = f"Orphaned ({ws_id})"
                zombies_found = True
            elif not ws_name:
                ws_name = "Global Vault"

            relationships.append({
                "workspace_id": ws_id,
                "workspace_name": ws_name,
                "status": d.get("status", "uploaded"),
                "chunks": d.get("chunks", 0),
                "last_indexed": d.get("updated_at") or d.get("created_at"),
                "is_primary": d.get("id") == doc.get("id")
            })
            
            for shared_ws in d.get("shared_with", []):
                s_ws_name = ws_map.get(shared_ws)
                if not s_ws_name:
                    s_ws_name = f"Orphaned ({shared_ws})"
                    zombies_found = True
                    
                relationships.append({
                    "workspace_id": shared_ws,
                    "workspace_name": s_ws_name,
                    "status": d.get("status", "uploaded"),
                    "chunks": d.get("chunks", 0),
                    "last_indexed": d.get("updated_at") or d.get("created_at"),
                    "is_primary": False,
                    "shared_from": ws_id
                })

        return {
            "metadata": {
                "id": doc["id"],
                "filename": doc["filename"],
                "extension": doc.get("extension"),
                "content_type": doc.get("content_type"),
                "created_at": doc.get("created_at"),
                "size": doc.get("size", "Unknown"),
                "minio_path": doc["minio_path"]
            },
            "relationships": relationships,
            "zombies_detected": zombies_found
        }

    async def sync_workspaces(self):
        """Cleanup logic for orphaned workspace references."""
        db = mongodb_manager.get_async_database()
        
        ws_cursor = db.workspaces.find({}, {"id": 1})
        valid_ws_ids = {ws["id"] for ws in await ws_cursor.to_list(1000)}
        valid_ws_ids.add("vault")
        valid_ws_ids.add("default")
        
        result_direct = await db.documents.update_many(
            {"workspace_id": {"$nin": list(valid_ws_ids)}},
            {"$set": {"workspace_id": "vault"}}
        )
        
        cursor = db.documents.find({"shared_with": {"$exists": True, "$ne": []}})
        async for doc in cursor:
            shared = doc.get("shared_with", [])
            valid_shared = [ws_id for ws_id in shared if ws_id in valid_ws_ids]
            if len(valid_shared) != len(shared):
                await db.documents.update_one({"_id": doc["_id"]}, {"$set": {"shared_with": valid_shared}})
        
        return {
            "repaired_direct": result_direct.modified_count,
            "status": "synchronized"
        }
