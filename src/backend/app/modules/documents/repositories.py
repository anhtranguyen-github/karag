import logging
import uuid
from datetime import datetime, UTC
from sqlalchemy import delete, select, update
from typing import Any
from app.infra.db.database import DatabaseManager, DocumentRow
from app.modules.documents.schemas import DocumentCreate, DocumentSummary

class DocumentRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database
        self.repo_logger = logging.getLogger(__name__)

    def _row_to_summary(self, row: DocumentRow) -> DocumentSummary:
        """Convert a DB row to a DocumentSummary."""
        return DocumentSummary(
            id=row.id,
            project_id=row.project_id,
            organization_id=row.organization_id,
            storage_path=row.storage_path,
            title=row.title,
            extension=row.extension,
            file_size=row.file_size,
            labels=row.labels_json or [],
            source=row.source or "",
            metadata=row.metadata_json or {},
            status=row.status or "pending",
            created_at=row.created_at,
        )


    def create(self, doc: DocumentCreate) -> DocumentSummary:
        doc_id = str(uuid.uuid4())
        with self.database.session() as session:
            row = DocumentRow(
                id=doc_id,
                project_id=doc.project_id,
                organization_id=doc.organization_id,
                title=doc.title,
                storage_path=doc.storage_path,
                extension=doc.extension,
                file_size=doc.file_size,
                labels_json=doc.labels,
                source=doc.source,
                metadata_json=doc.metadata,
                status=doc.status,
                created_at=datetime.now(UTC),
            )
            session.add(row)
        return self._row_to_summary(row)


    def get(self, organization_id: str, project_id: str, document_id: str) -> DocumentSummary | None:
        with self.database.session() as session:
            stmt = select(DocumentRow).where(
                DocumentRow.organization_id == organization_id,
                DocumentRow.project_id == project_id,
                DocumentRow.id == document_id,
            )
            row = session.execute(stmt).scalar_one_or_none()
            if not row:
                return None
            return self._row_to_summary(row)

    def list_for_project(self, organization_id: str, project_id: str) -> list[DocumentSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(DocumentRow).where(
                    DocumentRow.organization_id == organization_id,
                    DocumentRow.project_id == project_id,
                ).order_by(DocumentRow.created_at.desc())
            ).all()
            return [self._row_to_summary(row) for row in rows]

    def list_by_ids(self, organization_id: str, project_id: str, document_ids: list[str]) -> list[DocumentSummary]:
        if not document_ids:
            return []
        with self.database.session() as session:
            rows = session.scalars(
                select(DocumentRow).where(
                    DocumentRow.organization_id == organization_id,
                    DocumentRow.project_id == project_id,
                    DocumentRow.id.in_(document_ids),
                ).order_by(DocumentRow.created_at.desc())
            ).all()
            return [self._row_to_summary(row) for row in rows]

    def list_for_workspace(self, organization_id: str, project_id: str, workspace_id: str) -> list[DocumentSummary]:
        from app.infra.db.database import DocumentWorkspaceLinkRow

        with self.database.session() as session:
            rows = session.scalars(
                select(DocumentRow)
                .join(DocumentWorkspaceLinkRow, DocumentWorkspaceLinkRow.document_id == DocumentRow.id)
                .where(
                    DocumentRow.organization_id == organization_id,
                    DocumentRow.project_id == project_id,
                    DocumentWorkspaceLinkRow.workspace_id == workspace_id,
                )
                .order_by(DocumentRow.created_at.desc())
            ).all()
            return [self._row_to_summary(row) for row in rows]


    def update_status(self, organization_id: str, project_id: str, document_id: str, status: str) -> bool:
        with self.database.session() as session:
            stmt = update(DocumentRow).where(
                DocumentRow.organization_id == organization_id,
                DocumentRow.project_id == project_id,
                DocumentRow.id == document_id,
            ).values(status=status, updated_at=datetime.now(UTC))
            result = session.execute(stmt)
            return result.rowcount > 0

    def update_metadata(self, organization_id: str, project_id: str, document_id: str, metadata: dict[str, Any]) -> bool:
        with self.database.session() as session:
            stmt = update(DocumentRow).where(
                DocumentRow.organization_id == organization_id,
                DocumentRow.project_id == project_id,
                DocumentRow.id == document_id,
            ).values(metadata_json=metadata, updated_at=datetime.now(UTC))
            result = session.execute(stmt)
            return result.rowcount > 0

    def delete(self, organization_id: str, project_id: str, document_id: str) -> bool:
        with self.database.session() as session:
            result = session.execute(
                delete(DocumentRow).where(
                    DocumentRow.organization_id == organization_id,
                    DocumentRow.project_id == project_id,
                    DocumentRow.id == document_id,
                )
            )
            return result.rowcount > 0
