from neo4j import AsyncGraphDatabase
from backend.app.core.config import ai_settings
import structlog

logger = structlog.get_logger(__name__)


class Neo4jManager:
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

    async def close(self):
        if self.driver:
            await self.driver.close()
            self.driver = None
            logger.info("neo4j_driver_closed")

    async def execute_query(
        self, query: str, parameters: dict = None, workspace_id: str = "default"
    ):
        driver = self.get_driver()
        async with driver.session(database="neo4j") as session:
            params = parameters or {}
            params["workspace_id"] = workspace_id

            async def _work(tx):
                result = await tx.run(query, params)
                return await result.data()

            return await session.execute_write(_work)


neo4j_manager = Neo4jManager()
