import structlog
from typing import List, Dict, Any
from backend.app.core.neo4j import neo4j_manager
from backend.app.core.settings_manager import settings_manager
from backend.app.rag.qdrant_provider import qdrant
from backend.app.providers.llm import get_llm

logger = structlog.get_logger(__name__)

class GraphProvider:
    """
    Handles graph-aware retrieval using Neo4j to constrain or expand the search space.
    """
    
    async def search(
        self, 
        query: str, 
        query_vector: List[float], 
        workspace_id: str, 
        limit: int = 5
    ) -> List[Dict]:
        """
        Executes Graph-Aware RAG pipeline:
        1. Query Neo4j for entities related to the query keywords.
        2. Expand the search context via relationship traversal.
        3. Execute Hybrid search in Qdrant with graph-boosted keywords.
        """
        settings = await settings_manager.get_settings(workspace_id)
        
        # STEP 1: Extract potential entity names from query using LLM
        llm = await get_llm(workspace_id)
        extraction_prompt = f"""
        Extract the MOSY IMPORTANT entities (nouns, concepts, technologies) from the user query.
        Query: {query}
        Return ONLY a comma-separated list of entities. Maximum 5.
        """
        try:
            extraction_res = await llm.ainvoke(extraction_prompt)
            keywords = [k.strip() for k in extraction_res.content.split(",") if len(k.strip()) > 2]
        except Exception:
            # Fallback to simple split
            keywords = [word.strip(",.?!") for word in query.split() if len(word) > 3]
        
        logger.info("graph_search_entities", workspace_id=workspace_id, extracted_keywords=keywords)
        
        # STEP 2: Query Neo4j for related nodes and their neighbors (Knowledge Expansion)
        # Find nodes matching keywords for this specific workspace
        # We use =~ for partial case-insensitive match
        cypher = """
        UNWIND $keywords as word
        MATCH (n:Entity)
        WHERE n.workspace_id = $workspace_id 
        AND n.name =~ ('(?i).*' + word + '.*')
        WITH n
        MATCH (n)-[r]-(neighbor:Entity)
        RETURN n.name as entity, type(r) as relationship, neighbor.name as related_entity
        LIMIT 30
        """
        
        try:
            graph_context = await neo4j_manager.execute_query(
                cypher, 
                {"keywords": keywords, "workspace_id": workspace_id},
                workspace_id=workspace_id
            )
            
            # STEP 3: Build an expanded query string for Hybrid Search
            discovered_concepts = []
            for record in graph_context:
                discovered_concepts.append(record["related_entity"])
            
            # De-duplicate
            unique_concepts = list(set(discovered_concepts))
            
            # If we found graph context, enrich the text part of the search
            refined_query = query
            if unique_concepts:
                # We add the graph concepts as a boost
                boost_str = " ".join(unique_concepts[:10])
                refined_query = f"{query} {boost_str}"
                logger.info("graph_query_refined", original=query, refined=refined_query, concepts_found=len(unique_concepts))
            
            # STEP 4: Final retrieval from Vector DB (ranked chunks)
            results = await qdrant.hybrid_search(
                collection_name="knowledge_base",
                query_vector=query_vector,
                query_text=refined_query,
                limit=limit,
                alpha=settings.hybrid_alpha,
                workspace_id=workspace_id
            )
            
            # Annotate results with graph metadata
            for res in results:
                res["payload"]["rag_engine"] = "graph"
                if unique_concepts:
                    res["payload"]["graph_boost"] = unique_concepts[:10]
                    
            return results

        except Exception as e:
            logger.error("graph_retrieval_failed", error=str(e), workspace_id=workspace_id)
            # Fallback to basic search if Neo4j is down or fails
            return await qdrant.hybrid_search(
                collection_name="knowledge_base",
                query_vector=query_vector,
                query_text=query,
                limit=limit,
                alpha=settings.hybrid_alpha,
                workspace_id=workspace_id
            )

    async def upsert_entities(self, entities: List[Dict[str, Any]], workspace_id: str):
        """Insert or update entities and relationships in Neo4j."""
        cypher = """
        UNWIND $entities as ent
        MERGE (n:Entity {name: ent.name, workspace_id: $workspace_id})
        SET n.type = ent.type, n.last_updated = timestamp()
        WITH n, ent
        UNWIND ent.relationships as rel
        MERGE (other:Entity {name: rel.target, workspace_id: $workspace_id})
        MERGE (n)-[r:RELATED {type: rel.type}]->(other)
        SET r.workspace_id = $workspace_id
        """
        await neo4j_manager.execute_query(cypher, {"entities": entities}, workspace_id=workspace_id)

graph_provider = GraphProvider()
