from typing import Any

import structlog
from src.backend.app.core.settings_manager import settings_manager
from src.backend.app.providers.llm import get_llm

logger = structlog.get_logger(__name__)


class GraphProvider:
    """
    Handles graph-aware retrieval using Neo4j to constrain or expand the search space.
    """

    async def search(self, query: str, query_vector: list[float], workspace_id: str, limit: int = 5) -> list[dict]:
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

        logger.info(
            "graph_search_entities",
            workspace_id=workspace_id,
            extracted_keywords=keywords,
        )

        try:
            from src.backend.app.core.factory import ProviderFactory

            graph_store = await ProviderFactory.get_graph_store()

            graph_context = await graph_store.get_related_entities(
                keywords=keywords,
                workspace_id=workspace_id,
                limit=30,
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
                logger.info(
                    "graph_query_refined",
                    original=query,
                    refined=refined_query,
                    concepts_found=len(unique_concepts),
                )

            # STEP 4: Final retrieval from Vector DB (ranked chunks)
            from src.backend.app.core.factory import ProviderFactory

            store = await ProviderFactory.get_vector_store()

            search_results = await store.search(
                config=settings.retrieval,
                query_vector=query_vector,
                query_text=refined_query,
                workspace_id=workspace_id,
            )

            results = [{"id": res.id, "score": res.score, "payload": res.payload} for res in search_results]

            # Annotate results with graph metadata
            for res in results:
                res["payload"]["rag_engine"] = "graph"
                if unique_concepts:
                    res["payload"]["graph_boost"] = unique_concepts[:10]

            return results

        except Exception as e:
            logger.error("graph_retrieval_failed", error=str(e), workspace_id=workspace_id)
            # Fallback to basic search if Neo4j is down or fails
            from src.backend.app.core.factory import ProviderFactory

            store = await ProviderFactory.get_vector_store()

            search_results = await store.search(
                config=settings.retrieval,
                query_vector=query_vector,
                query_text=query,
                workspace_id=workspace_id,
            )
            return [{"id": res.id, "score": res.score, "payload": res.payload} for res in search_results]

    async def upsert_entities(self, entities: list[dict[str, Any]], workspace_id: str):
        """Insert or update entities and relationships using the injected GraphStore."""
        from src.backend.app.core.factory import ProviderFactory

        graph_store = await ProviderFactory.get_graph_store()

        await graph_store.upsert_entities(entities=entities, workspace_id=workspace_id)


graph_provider = GraphProvider()
