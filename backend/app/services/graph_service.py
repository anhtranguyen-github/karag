import json
import structlog
from typing import List, Dict
from backend.app.providers.llm import get_llm
from backend.app.rag.graph_provider import graph_provider

logger = structlog.get_logger(__name__)


class GraphService:
    """Service to extract and manage the knowledge graph structure."""

    async def extract_and_store_graph(self, text: str, workspace_id: str):
        """
        Extracts entities and relationships from text using an LLM in chunks if necessary.
        """
        # We split the text into chunks of ~4000 characters to avoid LLM context limits
        # and ensure detailed extraction.
        chunk_size = 4000
        text_chunks = [
            text[i : i + chunk_size] for i in range(0, len(text), chunk_size)
        ]

        import asyncio

        tasks = []
        for i, chunk in enumerate(text_chunks):
            logger.debug(
                "queueing_graph_chunk",
                chunk_index=i,
                total_chunks=len(text_chunks),
                workspace_id=workspace_id,
            )
            tasks.append(self._extract_chunk(chunk, workspace_id))

        # Extract all chunks in parallel
        results = await asyncio.gather(*tasks)

        all_entities = []
        for chunk_entities in results:
            if chunk_entities:
                all_entities.extend(chunk_entities)

        if not all_entities:
            return

        # Simple merging logic: Group by name and merge relationships
        merged_entities = self._merge_entities(all_entities)

        try:
            await graph_provider.upsert_entities(merged_entities, workspace_id)
            logger.info(
                "graph_extraction_complete",
                workspace_id=workspace_id,
                total_entities=len(merged_entities),
                chunks_processed=len(text_chunks),
            )
        except Exception as e:
            logger.error(
                "graph_storage_failed", error=str(e), workspace_id=workspace_id
            )

    async def _extract_chunk(self, text: str, workspace_id: str) -> List[Dict]:
        llm = await get_llm(workspace_id)

        prompt = f"""
        Extract a Knowledge Graph from the TEXT below. Focus on semantic relationships that define "who does what", "how things relate", and "core concepts".
        
        Text:
        {text}
        
        Identify:
        1. Entities: [Person, Organization, Concept, Technology, Event, Location]
        2. Relationships: Descriptive directed links between two entities.
        
        Formatting Rules:
        - Use Title Case for entity names.
        - Merge near-duplicates (e.g., "AI" and "Artificial Intelligence" -> "Artificial Intelligence").
        - Relationship types should be upper-snake-case (e.g., "PART_OF", "DEPENDS_ON").
        
        Return exactly a JSON list in this format:
        [
          {{
            "name": "Entity Name",
            "type": "Concept",
            "relationships": [
              {{"target": "Other Entity", "type": "RELATES_TO"}}
            ]
          }}
        ]
        
        If no meaningful entities are found, return [].
        Return ONLY the JSON. No markdown tags.
        """
        try:
            response = await llm.ainvoke(prompt)
            content = response.content.strip()
            # Clean up potential markdown formatting
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()

            # Basic validation
            data = json.loads(content)
            if not isinstance(data, list):
                return []
            return data
        except Exception as e:
            logger.warning(
                "chunk_extraction_failed", error=str(e), workspace_id=workspace_id
            )
            return []

    def _merge_entities(self, entities: List[Dict]) -> List[Dict]:
        """Merge entities with the same name to avoid duplicates and consolidate relationships."""
        registry = {}
        for ent in entities:
            name = ent.get("name")
            if not name:
                continue

            if name not in registry:
                registry[name] = {
                    "name": name,
                    "type": ent.get("type", "Concept"),
                    "relationships": [],
                }

            # Merge relationships, avoiding exact duplicates
            existing_rels = {
                (rel["target"], rel["type"]) for rel in registry[name]["relationships"]
            }
            for rel in ent.get("relationships", []):
                target = rel.get("target")
                rel_type = rel.get("type", "RelatedTo")
                if target and (target, rel_type) not in existing_rels:
                    registry[name]["relationships"].append(
                        {"target": target, "type": rel_type}
                    )
                    existing_rels.add((target, rel_type))

        return list(registry.values())


graph_service = GraphService()
