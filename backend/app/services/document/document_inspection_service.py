from backend.app.core.mongodb import mongodb_manager


class DocumentInspectionService:
    async def list_by_workspace(self, workspace_id: str) -> list[dict]:
        db = mongodb_manager.get_async_database()
        cursor = db.documents.find(
            {"$or": [{"workspace_id": workspace_id}, {"shared_with": workspace_id}]}
        )
        all_docs = await cursor.to_list(length=200)
        for d in all_docs:
            if d.get("shared_with") and workspace_id in d["shared_with"]:
                d["is_shared"] = True
            if "_id" in d:
                d["_id"] = str(d["_id"])
            d["name"] = d.get("filename")
        return all_docs

    async def list_all(self) -> list[dict]:
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

    async def list_vault(self) -> list[dict]:
        db = mongodb_manager.get_async_database()
        pipeline = [
            {"$sort": {"updated_at": -1}},
            {
                "$group": {
                    "_id": {"$ifNull": ["$content_hash", "$id"]},
                    "doc": {"$first": "$$ROOT"},
                }
            },
            {"$replaceRoot": {"newRoot": "$doc"}},
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

    async def get_by_id(self, doc_id: str) -> dict | None:
        """Find a document by its unique internal ID."""
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({"id": doc_id})
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def get_chunks(self, doc_id: str, limit: int = 100) -> list[dict]:
        """Retrieve vector chunks associated with a specific document ID."""
        doc = await self.get_by_id(doc_id)
        if not doc:
            return []

        ws_id = doc.get("workspace_id")
        from backend.app.rag.ingestion import ingestion_pipeline

        config, store = await ingestion_pipeline.get_ingestion_config(ws_id)
        return await store.get_document_chunks(config, doc_id, limit)

    async def inspect(self, doc_id: str) -> dict:
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

        relationships = []
        zombies_found = False

        for d in related_docs:
            ws_id = d.get("workspace_id", "unknown")

            # Identify storage vs indexing
            if ws_id == "vault":
                continue  # Vault is already in metadata

            ws_name = ws_map.get(ws_id)
            if not ws_name:
                ws_name = f"Orphaned ({ws_id})"
                zombies_found = True

            from backend.app.core.settings_manager import settings_manager

            settings = await settings_manager.get_settings(ws_id)

            relationships.append(
                {
                    "workspace_id": ws_id,
                    "workspace_name": ws_name,
                    "status": d.get("status", "uploaded"),
                    "chunks": d.get("chunks", 0),
                    "embedding_dim": settings.embedding_dim,
                    "model": settings.embedding_model,
                    "last_indexed": d.get("updated_at") or d.get("created_at"),
                    "is_primary": d.get("id") == doc.get("id"),
                    "type": "index",
                }
            )

            for shared_ws in d.get("shared_with", []):
                s_ws_name = ws_map.get(shared_ws)
                if not s_ws_name:
                    s_ws_name = f"Orphaned ({shared_ws})"
                    zombies_found = True

                s_settings = await settings_manager.get_settings(shared_ws)
                relationships.append(
                    {
                        "workspace_id": shared_ws,
                        "workspace_name": s_ws_name,
                        "status": d.get("status", "uploaded"),
                        "chunks": d.get("chunks", 0),
                        "embedding_dim": s_settings.embedding_dim,
                        "model": s_settings.embedding_model,
                        "last_indexed": d.get("updated_at") or d.get("created_at"),
                        "is_primary": False,
                        "shared_from": ws_id,
                        "type": "shared_ref",
                    }
                )

        return {
            "metadata": {
                "id": doc.get("id", doc_id),
                "filename": doc.get("filename", "Unknown"),
                "extension": doc.get("extension", ""),
                "content_type": doc.get("content_type", "application/octet-stream"),
                "created_at": doc.get("created_at"),
                "size": doc.get("size", "Unknown"),
                "minio_path": doc.get("minio_path", "N/A"),
            },
            "relationships": relationships,
            "zombies_detected": zombies_found,
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
            {"$set": {"workspace_id": "vault"}},
        )

        cursor = db.documents.find({"shared_with": {"$exists": True, "$ne": []}})
        async for doc in cursor:
            shared = doc.get("shared_with", [])
            valid_shared = [ws_id for ws_id in shared if ws_id in valid_ws_ids]
            if len(valid_shared) != len(shared):
                await db.documents.update_one(
                    {"_id": doc["_id"]}, {"$set": {"shared_with": valid_shared}}
                )

        return {
            "repaired_direct": result_direct.modified_count,
            "status": "synchronized",
        }
