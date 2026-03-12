from __future__ import annotations
import logging
from typing import Any, List, Dict

try:
    from qdrant_client.http import models as qdrant_models
except ImportError:
    qdrant_models = None

logger = logging.getLogger(__name__)

class QdrantFilterTranslator:
    """Translates canonical filter dicts into Qdrant Models."""

    @staticmethod
    def translate(filters: Dict[str, Any]) -> Any:
        if not qdrant_models or not filters:
            return None
            
        must_conditions = []
        
        for key, value in filters.items():
            # Handle Range filters (.gt, .lt, _after, _before)
            if key.endswith(("_gt", "_after")):
                clean_key = key.replace("_gt", "").replace("_after", "")
                must_conditions.append(
                    qdrant_models.FieldCondition(
                        key=clean_key, range=qdrant_models.Range(gt=value)
                    )
                )
            elif key.endswith(("_lt", "_before")):
                clean_key = key.replace("_lt", "").replace("_before", "")
                must_conditions.append(
                    qdrant_models.FieldCondition(
                        key=clean_key, range=qdrant_models.Range(lt=value)
                    )
                )
            elif key.endswith(("_gte", "_since")):
                clean_key = key.replace("_gte", "").replace("_since", "")
                must_conditions.append(
                    qdrant_models.FieldCondition(
                        key=clean_key, range=qdrant_models.Range(gte=value)
                    )
                )
            elif key.endswith(("_lte", "_until")):
                clean_key = key.replace("_lte", "").replace("_until", "")
                must_conditions.append(
                    qdrant_models.FieldCondition(
                        key=clean_key, range=qdrant_models.Range(lte=value)
                    )
                )
            elif isinstance(value, list) :
                # Handle IN matches
                must_conditions.append(
                    qdrant_models.FieldCondition(
                        key=key, match=qdrant_models.MatchAny(any=value)
                    )
                )
            else:
                # Default to equality
                must_conditions.append(
                    qdrant_models.FieldCondition(
                        key=key, match=qdrant_models.MatchValue(value=value)
                    )
                )

        if not must_conditions:
            return None
            
        return qdrant_models.Filter(must=must_conditions)
