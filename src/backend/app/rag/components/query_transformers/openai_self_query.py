from __future__ import annotations
import logging
import json
from typing import Any

from app.rag.components.base import BaseSelfQueryProcessor
from app.rag.schemas.types import ChatMessage

logger = logging.getLogger(__name__)

class OpenAISelfQuery(BaseSelfQueryProcessor):
    """LLM-powered metadata filter extraction using OpenAI/OmniRoute."""
    
    name = "openai_self_query"
    description = "Uses LLM to extract JSON filters from query based on canonical keys."
    requirement = ["openai"]
    config = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass

    async def process_query(self, query: str, rag_config: dict[str, Any]) -> dict[str, Any]:
        from app.rag.managers.component.inference_manager import InferenceManager
        inf_mgr = InferenceManager()
        
        # In a real scenario, we would provide the schema of available keys (e.g., author_id, project_id)
        # For this demo, we use a generic prompt.
        prompt = (
            "Extract metadata filters from the following query as a JSON object. "
            "Available keys: project_id, author_id, category, date_after. "
            "If no filters are found, return {}. "
            f"Query: {query}"
        )
        
        messages = [ChatMessage(role="user", content=prompt)]
        try:
            response = await inf_mgr.process(rag_config, messages)
            # Simple JSON extraction
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end != -1:
                return json.loads(response[start:end])
        except Exception as e:
            logger.warning("Self-Querying failed to parse filters: %s", e)
        
        return {}
