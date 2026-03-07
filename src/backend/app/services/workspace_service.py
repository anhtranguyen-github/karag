import uuid
from datetime import datetime
from typing import Any

import structlog
from src.backend.app.core.exceptions import ConflictError, NotFoundError, ValidationError
from src.backend.app.core.mongodb import mongodb_manager
from src.backend.app.repositories.workspace_repository import workspace_repository
from src.backend.app.schemas.chat import ThreadMetadata
from src.backend.app.schemas.documents import DocumentResponse
from src.backend.app.schemas.workspace import Workspace, WorkspaceDetail, WorkspaceStats

logger = structlog.get_logger(__name__)


class WorkspaceService:
    @staticmethod
    async def list_all(user_id: str) -> list[Workspace]:
        return await workspace_repository.list_by_owner(user_id)

    @staticmethod
    async def create(data: dict[str, Any], user_id: str) -> Workspace:
        """Create a new workspace with specified RAG settings."""
        db = mongodb_manager.get_async_database()
        name = data.get("name", "").strip()

        if not name:
            raise ValidationError("Workspace name cannot be empty.")

        from src.backend.app.core.constants import WORKSPACE_NAME_FORBIDDEN

        found_chars = [char for char in WORKSPACE_NAME_FORBIDDEN if char in name]
        if found_chars:
            raise ValidationError(
                message=f"Workspace name contains invalid characters: {' '.join(found_chars)}.",
                params={"found": found_chars},
            )

        # Check for duplicate name
        existing = await workspace_repository.find_by_name(name)
        if existing:
            raise ConflictError(f"A workspace with the name '{name}' already exists.")

        workspace_id = str(uuid.uuid4())[:8]
        timestamp = datetime.utcnow().isoformat()

        workspace_data = {
            "id": workspace_id,
            "name": name,
            "description": data.get("description", ""),
            "owner_id": user_id,
            "created_at": timestamp,
            "updated_at": timestamp,
        }

        workspace = await workspace_repository.create(workspace_data)

        # Persist all provided RAG settings to the database
        core_metadata_fields = ["name", "description"]
        settings_to_apply = {k: v for k, v in data.items() if k not in core_metadata_fields and v is not None}

        await db["workspace_settings"].insert_one({"workspace_id": workspace_id, **settings_to_apply})

        return workspace

    @staticmethod
    async def update(workspace_id: str, data: dict[str, Any]) -> Workspace:
        # Enforce Immutability of RAG Engine
        if "rag_engine" in data:
            del data["rag_engine"]

        if "name" in data:
            new_name = data["name"].strip()
            if not new_name:
                raise ValidationError("Workspace name cannot be empty.")

            from src.backend.app.core.constants import WORKSPACE_NAME_FORBIDDEN

            found_chars = [char for char in WORKSPACE_NAME_FORBIDDEN if char in new_name]
            if found_chars:
                raise ValidationError(
                    message=f"Workspace name contains invalid characters: {' '.join(found_chars)}.",
                    params={"found": found_chars},
                )

            existing = await workspace_repository.collection.find_one({"name": new_name, "id": {"$ne": workspace_id}})
            if existing:
                raise ConflictError(f"A workspace with the name '{new_name}' already exists.")
            data["name"] = new_name

        data["updated_at"] = datetime.utcnow().isoformat()

        result = await workspace_repository.update(workspace_id, data)
        if not result:
            raise NotFoundError(f"Workspace {workspace_id} not found.")

        return result

    @staticmethod
    async def delete(workspace_id: str, dataset_delete: bool = False):
        db = mongodb_manager.get_async_database()

        # 1. Handle associated documents
        # Batch delete using StorageService optimized method
        from src.backend.app.services.document_service import document_service

        await document_service.delete_many(workspace_id, delete_content=dataset_delete)

        # 2. Cleanup workspace meta
        await db.workspaces.delete_one({"id": workspace_id})
        await db["workspace_settings"].delete_one({"workspace_id": workspace_id})
        await db["thread_metadata"].delete_many({"workspace_id": workspace_id})

        # 3. Automatic Synchronization
        await document_service.sync_workspaces()

    @staticmethod
    async def get_details(workspace_id: str) -> WorkspaceDetail:
        ws = await workspace_repository.get_by_id(workspace_id)
        if not ws:
            raise NotFoundError(f"Workspace {workspace_id} not found")

        db = mongodb_manager.get_async_database()
        
        thread_docs = await db["thread_metadata"].find({"workspace_id": workspace_id}).sort("last_active", -1).to_list(100)
        threads = []
        for t in thread_docs:
            if "_id" in t:
                t["id"] = str(t["_id"])
            if "thread_id" not in t:
                t["thread_id"] = t.get("id", "")
            threads.append(ThreadMetadata.model_validate(t))

        doc_docs = await db.documents.find({"workspace_id": workspace_id}).to_list(length=100)
        documents = []
        for d in doc_docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
            documents.append(DocumentResponse.model_validate(d))

        from src.backend.app.core.settings_manager import settings_manager
        settings = await settings_manager.get_settings(workspace_id)

        return WorkspaceDetail(
            **ws.model_dump(exclude={"stats"}),
            threads=threads,
            documents=documents,
            settings=settings.model_dump(),
            stats=WorkspaceStats(thread_count=len(threads), doc_count=len(documents))
        )

    @staticmethod
    async def get_graph_data(workspace_id: str) -> dict:
        """Generate a semantic graph of documents and entities within a workspace."""
        from src.backend.app.core.settings_manager import settings_manager

        settings = await settings_manager.get_settings(workspace_id)

        nodes = []
        edges = []

        # 1. Document Nodes (Always show document-level relationships)
        from src.backend.app.rag.ingestion import ingestion_pipeline

        config, store = await ingestion_pipeline.get_ingestion_config(workspace_id)
        centroids_list = await store.get_document_centroids(config)

        centroids = {}
        for c in centroids_list:
            centroids[c["source"]] = {"name": c["title"], "vector": c["centroid"]}

        for doc_id, data in centroids.items():
            nodes.append(
                {
                    "id": doc_id,
                    "name": data["name"],
                    "val": 15,
                    "type": "document",
                    "color": "#4f46e5",
                }
            )

        import numpy as np

        doc_ids = list(centroids.keys())
        for i in range(len(doc_ids)):
            for j in range(i + 1, len(doc_ids)):
                id1, id2 = doc_ids[i], doc_ids[j]
                v1, v2 = (
                    np.array(centroids[id1]["vector"]),
                    np.array(centroids[id2]["vector"]),
                )
                sim = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
                if sim > 0.8:
                    edges.append(
                        {
                            "source": id1,
                            "target": id2,
                            "value": float(sim),
                            "type": "SIMILAR_TO",
                        }
                    )

        # 2. Knowledge Graph Nodes (Neo4j)
        if settings.rag_engine == "graph":
            from src.backend.app.core.factory import ProviderFactory

            try:
                graph_store = await ProviderFactory.get_graph_store()
                records = await graph_store.get_workspace_graph(workspace_id=workspace_id, limit=100)
                entities = {}
                for rec in records:
                    name = rec["name"]
                    if name not in entities:
                        entities[name] = rec["type"]
                        nodes.append(
                            {
                                "id": f"entity_{name}",
                                "name": name,
                                "val": 8,
                                "type": "entity",
                                "entity_type": rec["type"],
                                "color": "#f59e0b",
                            }
                        )

                    if rec["target"] and rec["rel_type"]:
                        edges.append(
                            {
                                "source": f"entity_{name}",
                                "target": f"entity_{rec['target']}",
                                "value": 1.0,
                                "type": rec["rel_type"],
                            }
                        )
            except Exception as e:
                logger.warning("neo4j_graph_fetch_failed", error=str(e), workspace_id=workspace_id)
                pass  # Fail gracefully if Neo4j is down
        return {"nodes": nodes, "edges": edges}


workspace_service = WorkspaceService()

