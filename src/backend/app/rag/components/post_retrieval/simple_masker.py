from __future__ import annotations
import logging
import re
from typing import Any

from app.rag.components.base import BaseMasker
from app.rag.schemas.types import PIISpan

logger = logging.getLogger(__name__)

class SimpleMasker(BaseMasker):
    """Regex-based PII masker for common patterns (Email, Phone, API Keys)."""
    
    name = "simple"
    description = "Fuzzy-regex based PII redaction."
    requirement = []
    config = {}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        pass

    async def mask(self, text: str, rag_config: dict[str, Any]) -> tuple[str, list[PIISpan]]:
        # Common patterns
        patterns = {
            "EMAIL": r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
            "PHONE": r"\+?\d{1,3}[-.\s]?\(?\d{1,4}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}",
            "API_KEY": r"(?:api[_-]?key|secret|token)[\s:=]+[a-zA-Z0-9_\-\.]{16,}",
        }
        
        spans = []
        redacted_text = text
        
        for entity, pattern in patterns.items():
            for match in re.finditer(pattern, text, re.IGNORECASE):
                span = PIISpan(
                    start=match.start(),
                    end=match.end(),
                    entity_type=entity,
                    text=match.group(),
                    redacted_text=f"<{entity}>"
                )
                spans.append(span)
        
        # Simple string replacement (sorted by start desc to avoid index shift)
        for span in sorted(spans, key=lambda x: x.start, reverse=True):
            redacted_text = redacted_text[:span.start] + span.redacted_text + redacted_text[span.end:]
            
        return redacted_text, spans
