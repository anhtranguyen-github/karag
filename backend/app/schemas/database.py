from backend.app.schemas.chunking import ChunkingConfig
from pydantic import BaseModel


class IngestionConfig(BaseModel):
    workspace_id: str
    vector_size: int = 1536
    chunking: ChunkingConfig | None = None
    collection_name_override: str | None = None
    sparse_enabled: bool = False

    # We can pass model refs for dense/sparse embedding here if needed,
    # but initially they are fetched from settings.
