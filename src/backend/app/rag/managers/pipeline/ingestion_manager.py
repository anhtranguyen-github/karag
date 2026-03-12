from __future__ import annotations
import logging
from typing import Any

from app.rag.rag_manager import RagManager
from app.rag.schemas.types import RagContext, FileStatus
from app.rag.schemas.schemas import FileConfig
from app.modules.workspaces.schemas import WorkspaceSetting
# Assuming this is the pattern to find the Setting object
from app.modules.workspaces.setting_manager import WorkspaceSettingManager

logger = logging.getLogger(__name__)

class IngestionManager:
    """
    Pipeline manager for orchestration of ingestion.
    Pipeline: source -> reader -> chunker -> embedder -> vectorstore
    Delegates component logic to RagManager correctly.
    """
    def __init__(self, rag_manager: RagManager):
        self.rag_manager = rag_manager
        
    async def run(
        self, 
        workspace_id: str, 
        project_id: str,
        organization_id: str,
        filename: str,
        content_bytes: bytes,
        mime_type: str = "application/pdf",
        track_id: str | None = None,
        on_progress: Any | None = None,
        document_id: str | None = None
    ) -> None:
        """
        Orchestrate the ingestion for a single file. (Synchronous-style for simplicity in this manager)
        In a real system, this would be an async background job.
        """
        logger.info(f"IngestionManager: starting run for {filename}")
        
        # 1. Prepare Config from Workspace
        # Simplified: Use default settings for now if workspace setting not available
        setting = WorkspaceSettingManager.build_default(workspace_id=workspace_id)
        
        # 2. Prepare Context
        from app.rag.utils.utils import resolve_collection_name
        context = RagContext(
            organization_id=organization_id,
            project_id=project_id,
            workspace_id=workspace_id,
            dataset_id="default",
            collection_name=resolve_collection_name("default", setting.embedding.model),
            filters={"workspace_id": workspace_id},
            top_k=setting.retriever.top_k,
            metadata={
                "project_id": project_id,
                "workspace_id": workspace_id,
                "filename": filename,
                "document_id": document_id,
            }
        )
        
        # 3. Create FileConfig (Metadata only)
        file_config = FileConfig(
            fileID=document_id or f"doc-{organization_id}-{filename}",
            filename=filename,
            storage_path=f"projects/{project_id}/docs/{filename}",
            project_id=project_id,
            organization_id=organization_id,
            file_size=len(content_bytes),
            status=FileStatus.PENDING,
            mime_type=mime_type,
            extension=filename.split(".")[-1],
            source="upload"
        )
        
        # 4. Delegate to RagManager for the core RAG logic (read -> chunk -> embed -> store)
        await self.rag_manager.import_document(
            setting, 
            file_config, 
            content_bytes, 
            context, 
            on_progress=on_progress
        )
        
        logger.info(f"IngestionManager: finished run for {filename}")
