from __future__ import annotations

import logging
from typing import Any

from app.rag.components.base import BaseQueryTransformer
from app.rag.schemas.types import ChatMessage

logger = logging.getLogger(__name__)

class HydeQueryTransformer(BaseQueryTransformer):
    """
    Hypothetical Document Embeddings (HyDE).
    Generates a hypothetical document using an LLM and uses it to enrich the retrieval query.
    """

    name = "hyde"
    description = "Hypothetical Document Embeddings (HyDE) transformer."
    requirement = ["openai"] # or generic generator config
    config = {"model": "str", "prompt_template": "str"}

    def __init__(self, rag_config: dict[str, Any]) -> None:
        self.rag_config = rag_config
        # We can configure the prompt for HyDE
        self.hyde_prompt = rag_config.get("query", {}).get("hyde_prompt", 
            "Please write a short hypothetical paragraph to answer the following question. "
            "Focus only on provide facts for a retrieval system to find relevant context. Question: {query}")

    async def transform(self, query: str, rag_config: dict[str, Any]) -> list[str]:
        # 1. Resolve Inference
        from app.rag.managers.component.inference_manager import InferenceManager
        inf_mgr = InferenceManager()

        # We use the inference engine configured in the system (e.g. OmniRoute)
        # to create the hypothetical answer.
        prompt = self.hyde_prompt.format(query=query)
        logger.info(f"[HyDE] Generating hypothetical doc for: {query[:50]}...")

        messages = [ChatMessage(role="user", content=prompt)]
        hypothetical_doc = await inf_mgr.process(rag_config, messages)

        # 2. Return the list of queries (original + hypothetical)
        # The RetrievalManager will search for both.
        return [query, hypothetical_doc]

