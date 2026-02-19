from pydantic import BaseModel, HttpUrl, Field
from typing import Optional



class UrlImportRequest(BaseModel):
    url: HttpUrl = Field(..., description="URL to import from")
    strategy: Optional[str] = Field(None, description="Ingestion strategy")

class SitemapImportRequest(BaseModel):
    url: HttpUrl = Field(..., description="Sitemap URL")

class GitHubImportRequest(BaseModel):
    url: HttpUrl = Field(..., description="GitHub repository URL")
    branch: str = Field("main", description="Branch name")

class DocumentWorkspaceUpdate(BaseModel):
    document_id: str
    target_workspace_id: str
    action: str = "share"  # share or move
    force_reindex: bool = False
