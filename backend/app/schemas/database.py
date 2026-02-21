from pydantic import BaseModel, Field
from typing import Optional, List, Any
from backend.app.schemas.chunking import ChunkingConfig

class IngestionConfig(BaseModel):
    workspace_id: str
    vector_size: int = 1536
    chunking: Optional[ChunkingConfig] = None
    collection_name_override: Optional[str] = None
    sparse_enabled: bool = False
    
    # We can pass model refs for dense/sparse embedding here if needed, 
    # but initially they are fetched from settings.
