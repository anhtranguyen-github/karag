from typing import Any

import httpx
import structlog

from src.backend.app.core.config import karag_settings
from src.backend.app.core.telemetry import get_tracer

logger = structlog.get_logger(__name__)
tracer = get_tracer(__name__)


class RerankerProvider:
    async def rerank(self, query: str, documents: list[dict[str, Any]], top_k: int) -> list[dict[str, Any]]:
        raise NotImplementedError


class CohereReranker(RerankerProvider):
    def __init__(self, api_key: str, model: str = "rerank-english-v3.0"):
        self.api_key = api_key
        self.model = model

    async def rerank(self, query: str, documents: list[dict[str, Any]], top_k: int) -> list[dict[str, Any]]:
        if not documents:
            return []

        url = "https://api.cohere.ai/v1/rerank"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "accept": "application/json",
        }

        # Prepare docs for Cohere: they expect a list of strings or objects
        docs_to_rank = [doc["payload"]["text"] for doc in documents]

        data = {
            "model": self.model,
            "query": query,
            "documents": docs_to_rank,
            "top_n": top_k,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=data)
            if response.status_code != 200:
                logger.error(
                    "cohere_rerank_failed",
                    status=response.status_code,
                    text=response.text,
                )
                return documents[:top_k]

            result = response.json()
            reranked_docs = []
            for item in result["results"]:
                idx = item["index"]
                doc = documents[idx]
                doc["rerank_score"] = item["relevance_score"]
                reranked_docs.append(doc)

            return reranked_docs


class JinaReranker(RerankerProvider):
    def __init__(self, api_key: str, model: str = "jina-reranker-v2-base-multilingual"):
        self.api_key = api_key
        self.model = model

    async def rerank(self, query: str, documents: list[dict[str, Any]], top_k: int) -> list[dict[str, Any]]:
        if not documents:
            return []

        url = "https://api.jina.ai/v1/rerank"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        docs_to_rank = [doc["payload"]["text"] for doc in documents]

        data = {
            "model": self.model,
            "query": query,
            "documents": docs_to_rank,
            "top_n": top_k,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=data)
            if response.status_code != 200:
                logger.error(
                    "jina_rerank_failed",
                    status=response.status_code,
                    text=response.text,
                )
                return documents[:top_k]

            result = response.json()
            reranked_docs = []
            for item in result["data"]:
                idx = item["index"]
                doc = documents[idx]
                doc["rerank_score"] = item["relevance_score"]
                reranked_docs.append(doc)

            return reranked_docs


class LocalReranker(RerankerProvider):
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        from sentence_transformers import CrossEncoder

        self.model = CrossEncoder(model_name)

    async def rerank(self, query: str, documents: list[dict[str, Any]], top_k: int) -> list[dict[str, Any]]:
        if not documents:
            return []

        # pairs are expected: (query, doc_text)
        pairs = [[query, doc["payload"]["text"]] for doc in documents]
        scores = self.model.predict(pairs)

        # Sort docs by scores
        results = []
        for i, score in enumerate(scores):
            doc = documents[i]
            doc["rerank_score"] = float(score)
            results.append(doc)

        results.sort(key=lambda x: x["rerank_score"], reverse=True)
        return results[:top_k]


async def get_reranker(
    workspace_id: str | None = None,
) -> RerankerProvider | None:
    from src.backend.app.core.settings_manager import settings_manager

    settings = await settings_manager.get_settings(workspace_id)
    config = settings.retrieval.rerank

    if not config.enabled:
        return None

    provider = config.provider.lower()

    if provider == "cohere":
        if not karag_settings.COHERE_API_KEY:
            logger.warning(
                "cohere_api_key_missing",
                msg="Cohere Reranker requested but no key found.",
            )
            return None
        return CohereReranker(karag_settings.COHERE_API_KEY, model=config.model)
    elif provider == "jina":
        if not karag_settings.JINA_API_KEY:
            logger.warning("jina_api_key_missing", msg="Jina Reranker requested but no key found.")
            return None
        return JinaReranker(karag_settings.JINA_API_KEY, model=config.model)
    elif provider == "local":
        return LocalReranker(model_name=config.model)
    else:
        return None
