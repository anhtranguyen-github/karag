from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List


class UrlImportRequest(BaseModel):
    url: HttpUrl = Field(..., description="URL to import from")
    dataset_id: Optional[str] = Field(None, description="Target dataset ID")
    strategy: Optional[str] = Field(None, description="Ingestion strategy")


class SitemapImportRequest(BaseModel):
    url: HttpUrl = Field(..., description="Sitemap URL")
    dataset_id: Optional[str] = Field(None, description="Target dataset ID")


class GitHubImportRequest(BaseModel):
    url: HttpUrl = Field(..., description="GitHub repository URL")
    dataset_id: Optional[str] = Field(None, description="Target dataset ID")
    branch: str = Field("main", description="Branch name")


class DocumentWorkspaceUpdate(BaseModel):
    document_id: str
    target_workspace_id: str
    action: str = "share"  # share or move
    force_reindex: bool = False


class DocumentResponse(BaseModel):
    """Standard document response for frontend integration.

    This schema is used for:
    - Document listing in workspace vault
    - Citation click-through from chat
    - Document metadata display
    """

    id: str = Field(..., description="Unique document ID (stable, persistent)")
    workspace_id: str = Field(..., description="Workspace this document belongs to")
    filename: str = Field(..., description="Original filename")
    content_type: str = Field(..., description="MIME type")
    source: Optional[str] = Field(None, description="Source URL or description")
    status: str = Field("uploaded", description="Processing status")
    size: Optional[int] = Field(None, description="File size in bytes")
    chunks: int = Field(0, description="Number of chunks indexed")
    created_at: Optional[str] = Field(None, description="Creation timestamp")
    updated_at: Optional[str] = Field(None, description="Last update timestamp")
    content: Optional[str] = Field(
        None, description="Document content (truncated for preview)"
    )
    download_url: Optional[str] = Field(None, description="Presigned URL for download")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "doc_abc123",
                "workspace_id": "ws_xyz789",
                "filename": "document.pdf",
                "content_type": "application/pdf",
                "source": "upload",
                "status": "indexed",
                "size": 1024000,
                "chunks": 42,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:35:00Z",
            }
        }
    }


class DocumentListResponse(BaseModel):
    """Response for document list endpoints."""

    documents: List[DocumentResponse]
    total: int
    workspace_id: str


class DocumentCitationResponse(BaseModel):
    """Response for citation document lookup.

    Used when frontend resolves [[doc:<document_id>]] from chat responses.
    """

    id: str = Field(..., description="Document ID from citation")
    filename: str = Field(..., description="Original filename")
    content_type: str = Field(..., description="MIME type")
    workspace_id: str = Field(..., description="Owning workspace")
    source: Optional[str] = Field(None, description="Source information")
    status: str = Field(..., description="Processing status")
    content_preview: Optional[str] = Field(
        None, description="First 5000 chars of content"
    )
    created_at: Optional[str] = Field(None)

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "doc_abc123",
                "filename": "research_paper.pdf",
                "content_type": "application/pdf",
                "workspace_id": "ws_xyz789",
                "source": "upload",
                "status": "indexed",
                "content_preview": "Abstract: This paper discusses...",
            }
        }
    }
