from __future__ import annotations

from sqlalchemy import delete, select

from app.core.database import DatabaseManager, WorkspaceRagConfigRow, WorkspaceRow
from app.core.tenancy import TenantContext
from app.modules.workspaces.schemas import WorkspaceSetting, WorkspaceSummary
from app.modules.workspaces.setting_manager import WorkspaceSettingManager


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


# Backward-compatible alias
WorkspaceRagConfigRepository = WorkspaceSettingRepository
