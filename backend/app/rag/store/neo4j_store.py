import structlog
from typing import List, Dict, Any
from neo4j import AsyncGraphDatabase
from backend.app.core.config import ai_settings
from backend.app.rag.store.graph_base import GraphStore

logger = structlog.get_logger(__name__)

class Neo4jStore(GraphStore):
    """
    Concrete implementation of GraphStore using Neo4j as the backing database.
    """
    def __init__(self):
        self.driver = None

    def get_driver(self):
        if not self.driver:
            self.driver = AsyncGraphDatabase.driver(
                ai_settings.NEO4J_URI,
                auth=(ai_settings.NEO4J_USER, ai_settings.NEO4J_PASSWORD),
            )
            logger.info("neo4j_driver_initialized", uri=ai_settings.NEO4J_URI)
        return self.driver

    async def execute_query(
        self, query: str, parameters: dict = None, workspace_id: str = "default"
    ):
        """Helper to execute raw Cypher queries internally."""
        driver = self.get_driver()
        async with driver.session(database="neo4j") as session:
            params = parameters or {}
            params["workspace_id"] = workspace_id

            async def _work(tx):
                result = await tx.run(query, params)
                return await result.data()

            return await session.execute_write(_work)

    async def get_related_entities(self, keywords: List[str], workspace_id: str, limit: int = 30) -> List[Dict[str, Any]]:
        cypher = """
        UNWIND $keywords as word
        MATCH (n:Entity)
        WHERE n.workspace_id = $workspace_id 
        AND n.name =~ ('(?i).*' + word + '.*')
        WITH n
        MATCH (n)-[r]-(neighbor:Entity)
        RETURN n.name as entity, type(r) as relationship, neighbor.name as related_entity
        LIMIT toInteger($limit)
        """
        return await self.execute_query(
            cypher,
            {"keywords": keywords, "limit": limit},
            workspace_id=workspace_id,
        )

    async def upsert_entities(self, entities: List[Dict[str, Any]], workspace_id: str) -> None:
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
        await self.execute_query(
            cypher, {"entities": entities}, workspace_id=workspace_id
        )

    async def get_workspace_graph(self, workspace_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        cypher = """
        MATCH (n:Entity {workspace_id: $workspace_id})
        OPTIONAL MATCH (n)-[r]->(m:Entity {workspace_id: $workspace_id})
        RETURN n.name as name, n.type as type, m.name as target, type(r) as rel_type
        LIMIT toInteger($limit)
        """
        return await self.execute_query(
            cypher, {"limit": limit}, workspace_id=workspace_id
        )

    async def close(self) -> None:
        if self.driver:
            await self.driver.close()
            self.driver = None
            logger.info("neo4j_driver_closed")
