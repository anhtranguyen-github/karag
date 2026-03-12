from __future__ import annotations

from datetime import UTC, datetime
from sqlalchemy import delete, select

from app.infra.db.database import (
    DatabaseManager,
    DocumentWorkspaceLinkRow,
    IngestionJobRow,
    RagDocumentRow,
    WorkspaceRagConfigRow,
    WorkspaceRow,
)

from app.core.tenancy import TenantContext
from app.modules.documents.schemas import IngestionJobSummary
from app.modules.workspaces.schemas import WorkspaceSetting, WorkspaceSummary
from app.modules.workspaces.setting_manager import WorkspaceSettingManager
from app.rag.schemas.pipeline_models import RAGDocument



def _workspace_to_schema(row: WorkspaceRow) -> WorkspaceSummary:
    return WorkspaceSummary(
        id=row.id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        name=row.name,
        description=row.description,
        status=row.status,
        created_at=row.created_at,
    )


class WorkspaceRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create(self, workspace: WorkspaceSummary) -> WorkspaceSummary:
        with self.database.session() as session:
            session.add(
                WorkspaceRow(
                    id=workspace.id,
                    organization_id=workspace.organization_id,
                    project_id=workspace.project_id,
                    name=workspace.name,
                    description=workspace.description,
                    status=workspace.status,
                    created_at=workspace.created_at,
                )
            )
        return workspace

    def list(self, tenant: TenantContext) -> list[WorkspaceSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(WorkspaceRow)
                .where(
                    WorkspaceRow.organization_id == tenant.organization_id,
                    WorkspaceRow.project_id == tenant.project_id,
                )
                .order_by(WorkspaceRow.name)
            ).all()
        return [_workspace_to_schema(row) for row in rows]

    def get(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSummary | None:
        with self.database.session() as session:
            row = session.scalar(
                select(WorkspaceRow).where(
                    WorkspaceRow.id == workspace_id,
                    WorkspaceRow.organization_id == tenant.organization_id,
                    WorkspaceRow.project_id == tenant.project_id,
                )
            )
        return _workspace_to_schema(row) if row else None

    def delete(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSummary | None:
        workspace = self.get(tenant, workspace_id)
        if not workspace:
            return None
        with self.database.session() as session:
            session.execute(delete(WorkspaceRow).where(WorkspaceRow.id == workspace_id))
        return workspace

    def update(self, tenant: TenantContext, workspace: WorkspaceSummary) -> WorkspaceSummary:
        with self.database.session() as session:
            row = session.scalar(
                select(WorkspaceRow).where(
                    WorkspaceRow.id == workspace.id,
                    WorkspaceRow.organization_id == tenant.organization_id,
                    WorkspaceRow.project_id == tenant.project_id,
                )
            )
            if row:
                row.name = workspace.name
                row.description = workspace.description
                row.status = workspace.status
        return workspace


class WorkspaceSettingRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def get(self, tenant: TenantContext, workspace_id: str) -> WorkspaceSetting | None:
        from app.modules.workspaces.schemas import (
            ChunkingConfig,
            EmbeddingConfig,
            LlmConfig,
            RAGConfig,
            RerankerConfig,
            RetrieverConfig,
            VectorStoreConfig,
        )

        with self.database.session() as session:
            row = session.scalar(
                select(WorkspaceRagConfigRow).where(
                    WorkspaceRagConfigRow.workspace_id == workspace_id,
                    WorkspaceRagConfigRow.organization_id == tenant.organization_id,
                    WorkspaceRagConfigRow.project_id == tenant.project_id,
                )
            )
        if not row:
            return None
        default_config = WorkspaceSettingManager.build_default(workspace_id=workspace_id)
        retrieval_payload = dict(row.retrieval_config_json or {})
        component_payload = retrieval_payload.pop("_pipeline_config", None) or {}
        default_payload = default_config.model_dump()
        return WorkspaceSetting(
            workspace_id=row.workspace_id,
            embedding=EmbeddingConfig(
                **{
                    **default_payload["embedding"],
                    "component": component_payload.get("embedder_component", default_config.embedding.component),
                    **(row.embedding_config_json or {}),
                }
            ),
            chunking=ChunkingConfig(
                component=component_payload.get("chunking_component", default_config.chunking.component),
                chunk_size=component_payload.get("chunk_size", default_config.chunking.chunk_size),
                chunk_overlap=component_payload.get("chunk_overlap", default_config.chunking.chunk_overlap),
            ),
            vectorstore=VectorStoreConfig(
                **{
                    **default_payload["vectorstore"],
                    "component": row.vector_store_type or default_config.vectorstore.component,
                    **(row.vector_store_config_json or {}),
                }
            ),
            retriever=RetrieverConfig(
                component=component_payload.get("retriever_component", default_config.retriever.component),
                top_k=retrieval_payload.get("top_k", default_config.retriever.top_k),
                score_threshold=retrieval_payload.get("score_threshold", default_config.retriever.score_threshold),
                final_top_k=retrieval_payload.get("final_top_k", default_config.retriever.final_top_k),
            ),
            reranker=RerankerConfig(
                **{
                    **default_payload["reranker"],
                    "component": component_payload.get("reranker_component", default_config.reranker.component),
                    **(row.rerank_config_json or {}),
                }
            ),
            llm=LlmConfig(**{**default_payload["llm"], **(row.llm_config_json or {})}),
            rag=RAGConfig(
                **{
                    **default_payload["rag"],
                    "reader": component_payload.get("reader", default_config.rag.reader),
                    "query_transformer": component_payload.get(
                        "query_transformer", default_config.rag.query_transformer
                    ),
                    "generator": component_payload.get("generator", default_config.rag.generator),
                    "prompt_template": row.prompt_template or default_config.rag.prompt_template,
                    **(row.reading_config_json or {}),
                }
            ),
            features=component_payload.get("features", default_config.features),
            updated_at=row.updated_at,
        )

    def upsert(self, tenant: TenantContext, config: WorkspaceSetting) -> WorkspaceSetting:
        with self.database.session() as session:
            row = session.scalar(
                select(WorkspaceRagConfigRow).where(
                    WorkspaceRagConfigRow.workspace_id == config.workspace_id,
                    WorkspaceRagConfigRow.organization_id == tenant.organization_id,
                    WorkspaceRagConfigRow.project_id == tenant.project_id,
                )
            )
            if not row:
                row = WorkspaceRagConfigRow(
                    workspace_id=config.workspace_id,
                    organization_id=tenant.organization_id,
                    project_id=tenant.project_id,
                )
                session.add(row)

            row.embedding_config_json = config.embedding.model_dump(exclude={"component"})
            row.vector_store_type = config.vectorstore.component
            row.vector_store_config_json = config.vectorstore.model_dump(exclude={"component"})
            retrieval_payload = config.retriever.model_dump(exclude={"component"})
            retrieval_payload["_pipeline_config"] = {
                "reader": config.rag.reader,
                "query_transformer": config.rag.query_transformer,
                "generator": config.rag.generator,
                "embedder_component": config.embedding.component,
                "chunking_component": config.chunking.component,
                "chunk_size": config.chunking.chunk_size,
                "chunk_overlap": config.chunking.chunk_overlap,
                "retriever_component": config.retriever.component,
                "reranker_component": config.reranker.component,
                "features": config.features,
            }
            row.retrieval_config_json = retrieval_payload
            row.rerank_config_json = config.reranker.model_dump(exclude={"component"})
            row.reading_config_json = config.rag.model_dump(
                exclude={"reader", "query_transformer", "generator", "prompt_template"}
            )
            row.llm_config_json = config.llm.model_dump()
            row.prompt_template = config.rag.prompt_template
            row.updated_at = config.updated_at
        return config

    def delete(self, tenant: TenantContext, workspace_id: str) -> None:
        with self.database.session() as session:
            session.execute(
                delete(WorkspaceRagConfigRow).where(
                    WorkspaceRagConfigRow.workspace_id == workspace_id,
                    WorkspaceRagConfigRow.organization_id == tenant.organization_id,
                    WorkspaceRagConfigRow.project_id == tenant.project_id,
                )
            )



class DocumentWorkspaceLinkRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create(self, link_id: str, document_id: str, workspace_id: str) -> None:
        with self.database.session() as session:
            session.add(
                DocumentWorkspaceLinkRow(
                    id=link_id,
                    document_id=document_id,
                    workspace_id=workspace_id,
                )
            )

    def delete(self, document_id: str, workspace_id: str) -> None:
        with self.database.session() as session:
            session.execute(
                delete(DocumentWorkspaceLinkRow).where(
                    DocumentWorkspaceLinkRow.document_id == document_id,
                    DocumentWorkspaceLinkRow.workspace_id == workspace_id,
                )
            )

    def delete_by_document(self, document_id: str) -> None:
        with self.database.session() as session:
            session.execute(
                delete(DocumentWorkspaceLinkRow).where(
                    DocumentWorkspaceLinkRow.document_id == document_id,
                )
            )

    def list_by_workspace(self, workspace_id: str) -> list[str]:
        """Returns list of document_ids linked to the workspace."""
        with self.database.session() as session:
            rows = session.scalars(
                select(DocumentWorkspaceLinkRow.document_id).where(
                    DocumentWorkspaceLinkRow.workspace_id == workspace_id
                )
            ).all()
        return list(rows)

    def list_by_document(self, document_id: str) -> list[str]:
        with self.database.session() as session:
            rows = session.scalars(
                select(DocumentWorkspaceLinkRow.workspace_id).where(
                    DocumentWorkspaceLinkRow.document_id == document_id
                )
            ).all()
        return list(rows)

    def exists(self, document_id: str, workspace_id: str) -> bool:
        with self.database.session() as session:
            return session.scalar(
                select(DocumentWorkspaceLinkRow.id).where(
                    DocumentWorkspaceLinkRow.document_id == document_id,
                    DocumentWorkspaceLinkRow.workspace_id == workspace_id,
                )
            ) is not None

    def count_by_document_ids(self, document_ids: list[str]) -> dict[str, int]:
        if not document_ids:
            return {}
        with self.database.session() as session:
            rows = session.execute(
                select(DocumentWorkspaceLinkRow.document_id).where(
                    DocumentWorkspaceLinkRow.document_id.in_(document_ids)
                )
            ).all()
        counts: dict[str, int] = {}
        for (document_id,) in rows:
            counts[document_id] = counts.get(document_id, 0) + 1
        return counts


class RagDocumentRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create(self, rag_doc: RAGDocument) -> None:
        import uuid
        with self.database.session() as session:
            session.add(
                RagDocumentRow(
                    id=rag_doc.id or str(uuid.uuid4()),
                    document_id=rag_doc.document_id,
                    workspace_id=rag_doc.workspace_id,
                    status=rag_doc.status.value,
                    progress=rag_doc.progress,
                    error_message=rag_doc.error_message,
                    chunk_count=rag_doc.chunk_count,
                )
            )

    def get(self, document_id: str, workspace_id: str) -> RagDocumentRow | None:
        with self.database.session() as session:
            return session.scalar(
                select(RagDocumentRow).where(
                    RagDocumentRow.document_id == document_id,
                    RagDocumentRow.workspace_id == workspace_id,
                )
            )

    def update_status(
        self,
        document_id: str,
        workspace_id: str,
        status: str,
        progress: int | None = None,
        error_message: str | None = None,
        chunk_count: int | None = None,
    ) -> None:
        from sqlalchemy import update
        with self.database.session() as session:
            values = {"status": status}
            if progress is not None:
                values["progress"] = progress
            if error_message is not None:
                values["error_message"] = error_message
            if chunk_count is not None:
                values["chunk_count"] = chunk_count

            session.execute(
                update(RagDocumentRow)
                .where(
                    RagDocumentRow.document_id == document_id,
                    RagDocumentRow.workspace_id == workspace_id,
                )
                .values(**values)
            )

    def delete(self, document_id: str, workspace_id: str) -> None:
        with self.database.session() as session:
            session.execute(
                delete(RagDocumentRow).where(
                    RagDocumentRow.document_id == document_id,
                    RagDocumentRow.workspace_id == workspace_id,
                )
            )

    def delete_by_document(self, document_id: str) -> None:
        with self.database.session() as session:
            session.execute(
                delete(RagDocumentRow).where(
                    RagDocumentRow.document_id == document_id,
                )
            )


class IngestionJobRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def _to_summary(self, row: IngestionJobRow) -> IngestionJobSummary:
        return IngestionJobSummary(
            job_id=row.job_id,
            document_id=row.document_id,
            workspace_id=row.workspace_id,
            track_id=row.track_id,
            status=row.status,
            error_message=row.error_message,
            created_at=row.created_at,
            updated_at=row.updated_at,
            completed_at=row.completed_at,
        )

    def create(
        self,
        *,
        job_id: str,
        document_id: str,
        workspace_id: str,
        organization_id: str,
        project_id: str,
        track_id: str,
        status: str = "queued",
    ) -> IngestionJobSummary:
        now = datetime.now(UTC)
        row = IngestionJobRow(
            job_id=job_id,
            document_id=document_id,
            workspace_id=workspace_id,
            organization_id=organization_id,
            project_id=project_id,
            track_id=track_id,
            status=status,
            created_at=now,
            updated_at=now,
        )
        with self.database.session() as session:
            session.add(row)
        return self._to_summary(row)

    def get(self, job_id: str) -> IngestionJobSummary | None:
        with self.database.session() as session:
            row = session.scalar(select(IngestionJobRow).where(IngestionJobRow.job_id == job_id))
        return self._to_summary(row) if row else None

    def latest_for_document(self, document_id: str, workspace_id: str | None = None) -> IngestionJobSummary | None:
        with self.database.session() as session:
            stmt = select(IngestionJobRow).where(IngestionJobRow.document_id == document_id)
            if workspace_id:
                stmt = stmt.where(IngestionJobRow.workspace_id == workspace_id)
            row = session.scalars(stmt.order_by(IngestionJobRow.updated_at.desc())).first()
        return self._to_summary(row) if row else None

    def latest_for_document_ids(
        self,
        document_ids: list[str],
        workspace_id: str | None = None,
    ) -> dict[str, IngestionJobSummary]:
        if not document_ids:
            return {}
        with self.database.session() as session:
            stmt = select(IngestionJobRow).where(IngestionJobRow.document_id.in_(document_ids))
            if workspace_id:
                stmt = stmt.where(IngestionJobRow.workspace_id == workspace_id)
            rows = session.scalars(stmt.order_by(IngestionJobRow.updated_at.desc())).all()
        latest: dict[str, IngestionJobSummary] = {}
        for row in rows:
            if row.document_id not in latest:
                latest[row.document_id] = self._to_summary(row)
        return latest

    def list_for_workspace(self, workspace_id: str, limit: int = 100) -> list[IngestionJobSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(IngestionJobRow)
                .where(IngestionJobRow.workspace_id == workspace_id)
                .order_by(IngestionJobRow.updated_at.desc())
                .limit(limit)
            ).all()
        return [self._to_summary(row) for row in rows]

    def update_status(
        self,
        job_id: str,
        *,
        status: str,
        error_message: str | None = None,
    ) -> IngestionJobSummary | None:
        with self.database.session() as session:
            row = session.scalar(select(IngestionJobRow).where(IngestionJobRow.job_id == job_id))
            if not row:
                return None
            row.status = status
            row.error_message = error_message
            row.updated_at = datetime.now(UTC)
            row.completed_at = datetime.now(UTC) if status in {"completed", "failed"} else None
        return self._to_summary(row)

    def delete_by_document(self, document_id: str) -> None:
        with self.database.session() as session:
            session.execute(
                delete(IngestionJobRow).where(IngestionJobRow.document_id == document_id)
            )


# Backward-compatible alias
WorkspaceRagConfigRepository = WorkspaceSettingRepository
