from __future__ import annotations

from pathlib import PurePosixPath
from io import BytesIO
from typing import Iterable, Any
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader

from app.core.container import PlatformContainer
from app.core.events import DATASET_UPDATED, DOCUMENT_PARSED, DOCUMENT_UPLOADED
from app.core.events import EMBEDDINGS_CREATED, TransactionalOutbox, build_event
from app.core.ports import StoredVector
from app.core.provider_selection import resolve_embedding_provider_name
from app.core.tenancy import TenantContext, require_workspace_scope
from app.core.vector_collections import resolve_collection_name
from app.modules.knowledge_datasets.schemas import ChunkSummary, DocumentSummary
from app.modules.knowledge_datasets.schemas import DocumentUploadResponse, KnowledgeDatasetCreate
from app.modules.knowledge_datasets.schemas import KnowledgeDatasetDetail, KnowledgeDatasetSummary


def _chunk_text(content: str, chunk_size: int) -> Iterable[str]:
    words = content.split()
    if not words:
        return []
    return [
        " ".join(words[index : index + chunk_size])
        for index in range(0, len(words), chunk_size)
    ]


def _extract_text(filename: str | None, content_type: str | None, content: bytes) -> tuple[str, dict[str, object]]:
    normalized_name = (filename or "").lower()
    if content_type == "application/pdf" or normalized_name.endswith(".pdf"):
        reader = PdfReader(BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n\n".join(part.strip() for part in pages if part.strip())
        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to extract text from PDF document.",
            )
        return text, {"parser": "pypdf", "page_count": len(reader.pages)}
    text = content.decode("utf-8", errors="ignore")
    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded document does not contain extractable text.",
        )
    return text, {"parser": "utf-8"}


class KnowledgeDatasetService:
    def __init__(self, container: PlatformContainer) -> None:
        self.container = container

    def _require_workspace(self, tenant: TenantContext, workspace_id: str) -> str:
        if not self.container.workspaces.get(tenant, workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        return workspace_id

    def _get_storage_for_project(self, organization_id: str, project_id: str):
        project = self.container.projects.get(organization_id, project_id)
        if not project:
            return self.container.storage_provider
        return self.container.storage_factory.create(project.document_storage_config)

    def _get_vector_store_for_workspace(self, tenant: TenantContext, workspace_id: str):
        config = self.container.workspace_rag_configs.get(tenant, workspace_id)
        if not config:
            return self.container.vector_store
        return self.container.vector_factory.create(
            config.vector_store_type, config.vector_store_config
        )

    def create_dataset(
        self,
        tenant: TenantContext,
        payload: KnowledgeDatasetCreate,
    ) -> KnowledgeDatasetSummary:
        workspace_id = self._require_workspace(tenant, payload.workspace_id)
        dataset = KnowledgeDatasetSummary(
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
            workspace_id=workspace_id,
            name=payload.name,
            description=payload.description,
            embedding_model=payload.embedding_model,
            chunk_strategy=payload.chunk_strategy,
        )
        created = self.container.knowledge_datasets.create(dataset)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=DATASET_UPDATED,
                tenant=tenant,
                resource_id=created.id,
                payload={"action": "created", "dataset_type": "knowledge"},
                workspace_id=workspace_id,
            )
        )
        outbox.flush(self.container.event_bus)
        return created

    def list_datasets(self, tenant: TenantContext, workspace_id: str) -> list[KnowledgeDatasetDetail]:
        self._require_workspace(tenant, workspace_id)
        datasets = self.container.knowledge_datasets.list(tenant, workspace_id)
        return [self._to_detail(tenant, dataset) for dataset in datasets]

    def get_dataset(self, tenant: TenantContext, dataset_id: str) -> KnowledgeDatasetDetail:
        dataset = self.container.knowledge_datasets.get(tenant, dataset_id)
        if not dataset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        require_workspace_scope(tenant, dataset.workspace_id)
        return self._to_detail(tenant, dataset)

    def delete_dataset(self, tenant: TenantContext, dataset_id: str) -> None:
        dataset = self.container.knowledge_datasets.get(tenant, dataset_id)
        if not dataset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        require_workspace_scope(tenant, dataset.workspace_id)
        storage = self._get_storage_for_project(tenant.organization_id, tenant.project_id)
        storage.delete_prefix(
            f"{tenant.organization_id}/{tenant.project_id}/{dataset.workspace_id}/{dataset.id}/"
        )
        collection_name = resolve_collection_name(
            self.container.settings.default_qdrant_collection,
            dataset.embedding_model,
        )
        vector_store = self._get_vector_store_for_workspace(tenant, dataset.workspace_id)
        vector_store.delete_by_filters(
            collection_name,
            {
                "org_id": tenant.organization_id,
                "project_id": tenant.project_id,
                "workspace_id": dataset.workspace_id,
                "dataset_id": dataset.id,
            },
        )
        self.container.documents.delete_for_dataset(dataset.id)
        self.container.chunks.delete_for_dataset(dataset.id)
        self.container.knowledge_datasets.delete(tenant, dataset.id)
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=DATASET_UPDATED,
                tenant=tenant,
                resource_id=dataset.id,
                payload={"action": "deleted", "dataset_type": "knowledge"},
                workspace_id=dataset.workspace_id,
            )
        )
        outbox.flush(self.container.event_bus)

    async def upload_document_to_project(
        self,
        tenant: TenantContext,
        project_id: str,
        file: UploadFile,
    ) -> DocumentSummary:
        content = await file.read()
        storage_path = str(
            PurePosixPath(
                tenant.organization_id,
                project_id,
                "documents",
                f"{uuid4()}-{file.filename}",
            )
        )
        storage = self._get_storage_for_project(tenant.organization_id, project_id)
        storage.store_object(
            storage_path,
            content,
            content_type=file.content_type,
            metadata={"title": file.filename},
        )
        text, extraction_metadata = _extract_text(file.filename, file.content_type, content)
        document = self.container.documents.create(
            DocumentSummary(
                dataset_id=None,
                organization_id=tenant.organization_id,
                project_id=project_id,
                workspace_id=None,
                title=file.filename or "untitled",
                storage_path=storage_path,
                metadata={
                    "content_type": file.content_type or "text/plain",
                    **extraction_metadata,
                },
            )
        )
        return document

    def list_project_documents(self, tenant: TenantContext, project_id: str) -> list[DocumentSummary]:
        return self.container.documents.list_for_project(tenant.organization_id, project_id)

    def attach_document(self, tenant: TenantContext, dataset_id: str, document_id: str) -> None:
        dataset = self.get_dataset(tenant, dataset_id)
        # Verify document exists in project
        # ...
        self.container.knowledge_dataset_documents.create(
            dataset_id=dataset.id,
            document_id=document_id,
            organization_id=tenant.organization_id,
            project_id=tenant.project_id,
        )

    async def ingest_dataset(self, tenant: TenantContext, dataset_id: str) -> None:
        dataset = self.get_dataset(tenant, dataset_id)
        document_ids = self.container.knowledge_dataset_documents.list_for_dataset(dataset_id)
        
        for doc_id in document_ids:
             # This is a bit inefficient (loading one by one), but works for the E2E flow.
             with self.container.database.session() as session:
                 from app.core.database import DocumentRow
                 row = session.get(DocumentRow, doc_id)
                 if not row: continue
                 document = DocumentSummary.model_validate(row)
             
             storage = self._get_storage_for_project(tenant.organization_id, document.project_id)
             content = storage.get_object(document.storage_path)
             text, _ = _extract_text(document.title, document.metadata.get("content_type"), content)
             
             await self._ingest_document_logic(tenant, dataset, document, text)

    async def upload_document(
        self,
        tenant: TenantContext,
        dataset_id: str,
        file: UploadFile,
    ) -> DocumentUploadResponse:
        dataset = self.container.knowledge_datasets.get(tenant, dataset_id)
        if not dataset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        require_workspace_scope(tenant, dataset.workspace_id)
        content = await file.read()
        storage_path = str(
            PurePosixPath(
                tenant.organization_id,
                tenant.project_id,
                dataset.workspace_id,
                dataset.id,
                "documents",
                f"{uuid4()}-{file.filename}",
            )
        )
        storage = self._get_storage_for_project(tenant.organization_id, tenant.project_id)
        storage.store_object(
            storage_path,
            content,
            content_type=file.content_type,
            metadata={"dataset_id": dataset.id, "title": file.filename},
        )
        text, extraction_metadata = _extract_text(file.filename, file.content_type, content)
        document = self.container.documents.create(
            DocumentSummary(
                dataset_id=dataset.id,
                organization_id=tenant.organization_id,
                project_id=tenant.project_id,
                workspace_id=dataset.workspace_id,
                title=file.filename or "untitled",
                storage_path=storage_path,
                metadata={
                    "content_type": file.content_type or "text/plain",
                    **extraction_metadata,
                },
            )
        )
        # Handle chunking and embedding logic
        result = await self._ingest_document_logic(tenant, dataset, document, text)
        
        outbox = TransactionalOutbox()
        outbox.stage(
            build_event(
                event_type=DOCUMENT_UPLOADED,
                tenant=tenant,
                resource_id=document.id,
                payload={"dataset_id": dataset.id, "storage_path": storage_path},
                workspace_id=dataset.workspace_id,
            )
        )
        published = outbox.flush(self.container.event_bus)
        
        return DocumentUploadResponse(
            document=document,
            chunks_created=result["chunks_created"],
            events=[event.event_type for event in published],
        )

    async def _ingest_document_logic(
        self,
        tenant: TenantContext,
        dataset: KnowledgeDatasetSummary,
        document: DocumentSummary,
        text: str,
    ) -> dict[str, Any]:
        chunks = [
            ChunkSummary(
                document_id=document.id,
                dataset_id=dataset.id,
                organization_id=tenant.organization_id,
                project_id=tenant.project_id,
                workspace_id=dataset.workspace_id,
                text=chunk,
                token_count=len(chunk.split()),
            )
            for chunk in _chunk_text(text, self.container.settings.default_chunk_size)
        ]
        self.container.chunks.create_many(chunks)
        embedding_provider_name = resolve_embedding_provider_name(
            dataset.embedding_model,
            self.container.embedding_providers.default_name,
        )
        embeddings = self.container.embedding_providers.get(embedding_provider_name).embed_texts(
            [chunk.text for chunk in chunks],
            model=dataset.embedding_model,
        )
        records = [
            StoredVector(
                id=chunk.id,
                values=embedding,
                payload={
                    "org_id": tenant.organization_id,
                    "project_id": tenant.project_id,
                    "workspace_id": dataset.workspace_id,
                    "dataset_id": dataset.id,
                    "document_id": document.id,
                    "chunk_id": chunk.id,
                    "chunk_text": chunk.text,
                    "document_title": document.title,
                },
            )
            for chunk, embedding in zip(chunks, embeddings, strict=True)
        ]
        collection_name = resolve_collection_name(
            self.container.settings.default_qdrant_collection,
            dataset.embedding_model,
        )
        vector_store = self._get_vector_store_for_workspace(tenant, dataset.workspace_id)
        vector_store.upsert_embeddings(
            collection_name,
            records,
        )
        return {"chunks_created": len(chunks)}

    def list_documents(self, tenant: TenantContext, dataset_id: str) -> list[DocumentSummary]:
        dataset = self.container.knowledge_datasets.get(tenant, dataset_id)
        if not dataset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        require_workspace_scope(tenant, dataset.workspace_id)
        return self.container.documents.list_for_dataset(tenant, dataset_id)

    def list_chunks(self, tenant: TenantContext, dataset_id: str) -> list[ChunkSummary]:
        dataset = self.container.knowledge_datasets.get(tenant, dataset_id)
        if not dataset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        require_workspace_scope(tenant, dataset.workspace_id)
        return self.container.chunks.list_for_dataset(tenant, dataset_id)

    def _to_detail(
        self,
        tenant: TenantContext,
        dataset: KnowledgeDatasetSummary,
    ) -> KnowledgeDatasetDetail:
        return KnowledgeDatasetDetail(
            **dataset.model_dump(),
            document_count=self.container.documents.count_for_dataset(tenant, dataset.id),
            chunk_count=self.container.chunks.count_for_dataset(tenant, dataset.id),
        )
