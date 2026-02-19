from pydantic import BaseModel
from typing import Optional, Dict, Any


class ToolDefinition(BaseModel):
    id: str
    name: str
    description: str
    type: str = "system"  # system, custom, mcp
    enabled: bool = True
    config: Optional[Dict[str, Any]] = {}
