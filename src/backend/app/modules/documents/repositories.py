from __future__ import annotations
import uuid
from datetime import datetime, UTC
from sqlalchemy import select
from app.core.database import DatabaseManager, DocumentRow
from app.modules.documents.schemas import DocumentCreate, DocumentSummary

class DocumentRepository:
    def __init__(self, database: DatabaseManager) -> None:
        self.database = database

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
                created_at=datetime.now(UTC)
            )
            session.add(row)
        
        return DocumentSummary(
            id=doc_id,
            project_id=doc.project_id,
            organization_id=doc.organization_id,
            title=doc.title,
            extension=doc.extension,
            file_size=doc.file_size,
            labels=doc.labels,
            source=doc.source,
            metadata=doc.metadata,
            status="pending",
            created_at=row.created_at
        )

    def list_for_project(self, organization_id: str, project_id: str) -> list[DocumentSummary]:
        with self.database.session() as session:
            rows = session.scalars(
                select(DocumentRow).where(
                    DocumentRow.organization_id == organization_id,
                    DocumentRow.project_id == project_id
                )
            ).all()
            return [
                DocumentSummary(
                    id=row.id,
                    project_id=row.project_id,
                    organization_id=row.organization_id,
                    title=row.title,
                    extension=row.extension,
                    file_size=row.file_size,
                    labels=row.labels_json,
                    source=row.source,
                    metadata=row.metadata_json,
                    status="completed", # placeholder
                    created_at=row.created_at
                ) for row in rows
            ]
