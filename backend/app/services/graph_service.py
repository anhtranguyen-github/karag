import json
import structlog
from typing import List, Dict, Any
from backend.app.providers.llm import get_llm
from backend.app.rag.graph_provider import graph_provider

logger = structlog.get_logger(__name__)

class GraphService:
    """Service to extract and manage the knowledge graph structure."""

    async def extract_and_store_graph(self, text: str, workspace_id: str):
        """
        Extracts entities and relationships from text using an LLM and stores them in Neo4j.
        """
        llm = await get_llm(workspace_id)
        
        prompt = f"""
        Extract the knowledge graph from the following text. 
        Identify main entities (Person, Organization, Concept, Technology, Event) and their relationships.
        
        Text:
        {text[:4000]}
        
        Return ONLY a JSON list of objects:
        [
          {{
            "name": "Entity Name",
            "type": "Concept/Person",
            "relationships": [
              {{"target": "Other Entity", "type": "DependsOn/PartOf/WorksAt"}}
            ]
          }}
        ]
        """
        
        try:
            response = await llm.ainvoke(prompt)
            # Clean response if LLM returns markdown blocks
            content = response.content.replace("```json", "").replace("```", "").strip()
            
            entities = json.loads(content)
            if not entities:
                return
            
            await graph_provider.upsert_entities(entities, workspace_id)
            logger.info("graph_extraction_complete", workspace_id=workspace_id, entities_count=len(entities))
            
        except Exception as e:
            logger.error("graph_extraction_failed", error=str(e), workspace_id=workspace_id)

graph_service = GraphService()
