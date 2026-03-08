from __future__ import annotations

from sqlalchemy import delete, select

from app.core.database import ChunkRow, DatabaseManager, DocumentRow, KnowledgeDatasetRow
from app.core.tenancy import TenantContext
from app.modules.knowledge_datasets.schemas import ChunkSummary, DocumentSummary
from app.modules.knowledge_datasets.schemas import KnowledgeDatasetSummary


def _dataset_to_schema(row: KnowledgeDatasetRow) -> KnowledgeDatasetSummary:
    return KnowledgeDatasetSummary(
        id=row.id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        workspace_id=row.workspace_id,
        name=row.name,
        description=row.description,
        embedding_model=row.embedding_model,
        chunk_strategy=row.chunk_strategy,
        created_at=row.created_at,
    )


def _document_to_schema(row: DocumentRow) -> DocumentSummary:
    return DocumentSummary(
        id=row.id,
        dataset_id=row.dataset_id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        workspace_id=row.workspace_id,
        title=row.title,
        storage_path=row.storage_path,
        metadata=row.metadata_json,
        created_at=row.created_at,
    )


def _chunk_to_schema(row: ChunkRow) -> ChunkSummary:
    return ChunkSummary(
        id=row.id,
        document_id=row.document_id,
        dataset_id=row.dataset_id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        workspace_id=row.workspace_id,
        text=row.text,
        token_count=row.token_count,
        created_at=row.created_at,
    )


class KnowledgeDatasetRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create(self, dataset: KnowledgeDatasetSummary) -> KnowledgeDatasetSummary:
        row = KnowledgeDatasetRow(
            id=dataset.id,
            organization_id=dataset.organization_id,
            project_id=dataset.project_id,
            workspace_id=dataset.workspace_id,
            name=dataset.name,
            description=dataset.description,
            embedding_model=dataset.embedding_model,
            chunk_strategy=dataset.chunk_strategy,
            created_at=dataset.created_at,
        )
        with self.database.session() as session:
            session.add(row)
        return dataset

    def list(self, tenant: TenantContext, workspace_id: str) -> list[KnowledgeDatasetSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(KnowledgeDatasetRow).where(
                    KnowledgeDatasetRow.organization_id == tenant.organization_id,
                    KnowledgeDatasetRow.project_id == tenant.project_id,
                    KnowledgeDatasetRow.workspace_id == workspace_id,
                )
            ).all()
        return [_dataset_to_schema(row) for row in rows]

    def get(self, tenant: TenantContext, dataset_id: str) -> KnowledgeDatasetSummary | None:
        with self.database.session() as session:
            row = session.scalar(
                select(KnowledgeDatasetRow).where(
                    KnowledgeDatasetRow.id == dataset_id,
                    KnowledgeDatasetRow.organization_id == tenant.organization_id,
                    KnowledgeDatasetRow.project_id == tenant.project_id,
                )
            )
        return _dataset_to_schema(row) if row else None

    def delete(self, tenant: TenantContext, dataset_id: str) -> KnowledgeDatasetSummary | None:
        dataset = self.get(tenant, dataset_id)
        if not dataset:
            return None
        with self.database.session() as session:
            session.execute(delete(KnowledgeDatasetRow).where(KnowledgeDatasetRow.id == dataset_id))
        return dataset


class DocumentRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create(self, document: DocumentSummary) -> DocumentSummary:
        with self.database.session() as session:
            session.add(
                DocumentRow(
                    id=document.id,
                    dataset_id=document.dataset_id,
                    organization_id=document.organization_id,
                    project_id=document.project_id,
                    workspace_id=document.workspace_id,
                    title=document.title,
                    storage_path=document.storage_path,
                    metadata_json=document.metadata,
                    created_at=document.created_at,
                )
            )
        return document

    def list_for_dataset(self, tenant: TenantContext, dataset_id: str) -> list[DocumentSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(DocumentRow).where(
                    DocumentRow.dataset_id == dataset_id,
                    DocumentRow.organization_id == tenant.organization_id,
                    DocumentRow.project_id == tenant.project_id,
                )
            ).all()
        return [_document_to_schema(row) for row in rows]

    def list_for_workspace(self, tenant: TenantContext, workspace_id: str) -> list[DocumentSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(DocumentRow).where(
                    DocumentRow.organization_id == tenant.organization_id,
                    DocumentRow.project_id == tenant.project_id,
                    DocumentRow.workspace_id == workspace_id,
                )
            ).all()
        return [_document_to_schema(row) for row in rows]

    def delete_for_dataset(self, dataset_id: str) -> None:
        with self.database.session() as session:
            session.execute(delete(DocumentRow).where(DocumentRow.dataset_id == dataset_id))


class ChunkRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

    def create_many(self, chunks: list[ChunkSummary]) -> list[ChunkSummary]:
        with self.database.session() as session:
            session.add_all(
                [
                    ChunkRow(
                        id=chunk.id,
                        document_id=chunk.document_id,
                        dataset_id=chunk.dataset_id,
                        organization_id=chunk.organization_id,
                        project_id=chunk.project_id,
                        workspace_id=chunk.workspace_id,
                        text=chunk.text,
                        token_count=chunk.token_count,
                        created_at=chunk.created_at,
                    )
                    for chunk in chunks
                ]
            )
        return chunks

    def list_for_dataset(self, tenant: TenantContext, dataset_id: str) -> list[ChunkSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(ChunkRow).where(
                    ChunkRow.dataset_id == dataset_id,
                    ChunkRow.organization_id == tenant.organization_id,
                    ChunkRow.project_id == tenant.project_id,
                )
            ).all()
        return [_chunk_to_schema(row) for row in rows]

    def delete_for_dataset(self, dataset_id: str) -> None:
        with self.database.session() as session:
            session.execute(delete(ChunkRow).where(ChunkRow.dataset_id == dataset_id))
