from src.backend.app.core.mongodb import mongodb_manager
from src.backend.app.repositories.document_repository import document_repository
from src.backend.app.repositories.workspace_repository import workspace_repository
from src.backend.app.schemas.documents import (
    DocumentInspectionResponse,
    DocumentListItem,
    DocumentMetadata,
    DocumentRelationship,
    DocumentResponse,
)


class DocumentInspectionService:
    async def list_by_workspace(self, workspace_id: str) -> list[DocumentListItem]:
        cursor = document_repository.collection.find(
            {"$or": [{"workspace_id": workspace_id}, {"shared_with": workspace_id}]}
        )
        all_docs = await cursor.to_list(length=200)
        docs = []
        for d in all_docs:
            if d.get("shared_with") and workspace_id in d["shared_with"]:
                d["is_shared"] = True
            docs.append(DocumentListItem.model_validate(document_repository.normalize_id(d)))
        return docs

    async def list_all(self) -> list[DocumentListItem]:
        docs = await document_repository.list_all(limit=1000)

        workspaces = await workspace_repository.list_all(limit=1000)
        ws_map = {ws.id: ws.name for ws in workspaces}

        for d in docs:
            d.source = ws_map.get(d.workspace_id, "Unknown Workspace")  # reusing source field or adding extra?
            # actually DocumentResponse doesn't have workspace_name, maybe I should add it or use source
        return docs

    async def get_by_id(self, doc_id: str) -> DocumentResponse | None:
        """Find a document by its unique internal ID."""
        return await document_repository.get_by_id(doc_id)

    async def get_chunks(self, doc_id: str, limit: int = 100) -> list[dict]:
        """Retrieve vector chunks associated with a specific document ID."""
        doc = await self.get_by_id(doc_id)
        if not doc:
            return []

        ws_id = doc.get("workspace_id")
        from src.backend.app.rag.ingestion import ingestion_pipeline

        config, store = await ingestion_pipeline.get_ingestion_config(ws_id)
        return await store.get_document_chunks(config, doc_id, limit)

    async def inspect(self, doc_id: str) -> DocumentInspectionResponse:
        """Inspect document state and relationships using its internal ID."""
        doc = await self.get_by_id(doc_id)
        if not doc:
            from src.backend.app.core.exceptions import NotFoundError

            raise NotFoundError(f"Document {doc_id} not found")

        content_hash = getattr(doc, "content_hash", None)
        if not content_hash:
            # Fallback for old documents
            db = mongodb_manager.get_async_database()
            raw = await db.documents.find_one({"id": doc_id})
            content_hash = raw.get("content_hash")

        db = mongodb_manager.get_async_database()
        cursor = db.documents.find({"content_hash": content_hash})
        related_docs = await cursor.to_list(1000)

        workspaces = await workspace_repository.list_all(limit=1000)
        ws_map = {ws.id: ws.name for ws in workspaces}

        relationships = []
        zombies_found = False

        for d in related_docs:
            ws_id = d.get("workspace_id", "unknown")

            if not ws_id:
                continue

            ws_name = ws_map.get(ws_id)
            if not ws_name:
                ws_name = f"Orphaned ({ws_id})"
                zombies_found = True

            from src.backend.app.core.settings_manager import settings_manager

            settings = await settings_manager.get_settings(ws_id)

            relationships.append(
                DocumentRelationship(
                    workspace_id=ws_id,
                    workspace_name=ws_name,
                    status=d.get("status", "uploaded"),
                    chunks=d.get("chunks", 0),
                    embedding_dim=settings.embedding_dim,
                    model=settings.embedding_model,
                    last_indexed=d.get("updated_at") or d.get("created_at"),
                    is_primary=d.get("id") == doc.id,
                    type="index",
                )
            )

            for shared_ws in d.get("shared_with", []):
                s_ws_name = ws_map.get(shared_ws)
                if not s_ws_name:
                    s_ws_name = f"Orphaned ({shared_ws})"
                    zombies_found = True

                s_settings = await settings_manager.get_settings(shared_ws)
                relationships.append(
                    DocumentRelationship(
                        workspace_id=shared_ws,
                        workspace_name=s_ws_name,
                        status=d.get("status", "uploaded"),
                        chunks=d.get("chunks", 0),
                        embedding_dim=s_settings.embedding_dim,
                        model=s_settings.embedding_model,
                        last_indexed=d.get("updated_at") or d.get("created_at"),
                        is_primary=False,
                        shared_from=ws_id,
                        type="shared_ref",
                    )
                )

        return DocumentInspectionResponse(
            metadata=DocumentMetadata(
                id=doc.id,
                filename=doc.filename,
                extension=getattr(doc, "extension", None),
                content_type=doc.content_type,
                created_at=doc.created_at,
                size=doc.size,
                minio_path=getattr(doc, "minio_path", None),
            ),
            relationships=relationships,
            zombies_detected=zombies_found,
        )

    async def sync_workspaces(self):
        """Cleanup logic for orphaned workspace references."""
        db = mongodb_manager.get_async_database()

        ws_cursor = db.workspaces.find({}, {"id": 1})
        valid_ws_ids = {ws["id"] for ws in await ws_cursor.to_list(1000)}
        valid_ws_ids.add("vault")
        result_direct = await db.documents.delete_many({"workspace_id": {"$nin": list(valid_ws_ids)}})

        cursor = db.documents.find({"shared_with": {"$exists": True, "$ne": []}})
        async for doc in cursor:
            shared = doc.get("shared_with", [])
            valid_shared = [ws_id for ws_id in shared if ws_id in valid_ws_ids]
            if len(valid_shared) != len(shared):
                await db.documents.update_one({"_id": doc["_id"]}, {"$set": {"shared_with": valid_shared}})

        return {
            "repaired_direct": result_direct.deleted_count,
            "status": "synchronized",
        }
