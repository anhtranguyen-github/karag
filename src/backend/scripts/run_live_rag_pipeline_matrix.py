from __future__ import annotations

import itertools
import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import urlopen

from fastapi.testclient import TestClient
from sqlalchemy import create_engine


ROOT = Path(__file__).resolve().parents[3]
PDF_PATH = ROOT / ".docs" / "1906.05799v4.pdf"
DESCRIPTION = "live matrix"
OMNIROUTE_API_BASE = os.getenv("OMNIROUTE_API_BASE", "http://127.0.0.1:20128/v1")
OMNIROUTE_MODEL = os.getenv("OMNIROUTE_MODEL")
JINA_MODEL = os.getenv("JINA_EMBEDDING_MODEL", "jina-embeddings-v3")
JINA_RERANK_MODEL = os.getenv("JINA_RERANK_MODEL", "jina-reranker-v2-base-multilingual")
QUERY = os.getenv("RAG_MATRIX_QUERY", "Who wrote this paper?")
EXPECTED_ANSWER_KEYWORDS = ("nguyen", "reddi")


def _database_url_available(database_url: str) -> bool:
    engine = create_engine(database_url)
    try:
        with engine.connect():
            return True
    except Exception:
        return False
    finally:
        engine.dispose()


def _ensure_live_env() -> str:
    jina_key = os.getenv("JINA_AI_API_KEY") or os.getenv("JINA_API_KEY")
    if not jina_key:
        raise RuntimeError("Missing JINA_API_KEY or JINA_AI_API_KEY in the environment.")
    os.environ.setdefault("JINA_AI_API_KEY", jina_key)
    for candidate in (
        os.getenv("RAG_MATRIX_DATABASE_URL"),
        os.getenv("DATABASE_URL"),
        "sqlite+pysqlite:///:memory:",
    ):
        if candidate and _database_url_available(candidate):
            os.environ["DATABASE_URL"] = candidate
            break
    return jina_key


def _omniroute_available() -> bool:
    try:
        with urlopen(f"{OMNIROUTE_API_BASE.rstrip('/')}/models", timeout=2) as response:
            return response.status == 200
    except URLError:
        return False


def _resolve_omniroute_model() -> str:
    if OMNIROUTE_MODEL:
        return OMNIROUTE_MODEL
    try:
        with urlopen(f"{OMNIROUTE_API_BASE.rstrip('/')}/models", timeout=2) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return "cost-saver"
    for item in payload.get("data", []):
        model_id = item.get("id")
        if isinstance(model_id, str) and model_id:
            return model_id
    return "cost-saver"


def _headers(org_id: str, project_id: str, workspace_id: str | None = None) -> dict[str, str]:
    headers = {
        "X-Organization-Id": org_id,
        "X-Project-Id": project_id,
    }
    if workspace_id:
        headers["X-Workspace-Id"] = workspace_id
    return headers


def _create_base_config(jina_key: str, omniroute_model: str) -> dict[str, Any]:
    return {
        "embedding_config": {
            "provider": "jina",
            "model": JINA_MODEL,
            "dimension": 1024,
            "batch_size": 16,
            "api_key": jina_key,
        },
        "vector_store_type": "pgvector",
        "vector_store_config": {
            "distance_metric": "cosine",
            "index_type": "hnsw",
            "vector_dimension": 1024,
        },
        "retrieval_config": {
            "top_k": 4,
            "score_threshold": 0.0,
            "hybrid_search": True,
            "reranker_model": JINA_RERANK_MODEL,
            "chunk_size": 512,
            "chunk_overlap": 64,
        },
        "rerank_config": {
            "provider": "jina",
            "model": JINA_RERANK_MODEL,
            "api_key": jina_key,
            "api_base": None,
        },
        "reading_config": {
            "max_context_tokens": 4000,
            "context_compression": False,
            "citation_mode": "inline",
            "context_formatting_template": "[{index}] {document_title}: {text}",
        },
        "llm_config": {
            "provider": "omniroute",
            "model": "cost-saver",
            "temperature": 0.2,
            "max_tokens": 700,
            "streaming": False,
            "api_key": "omniroute-local",
            "api_base": OMNIROUTE_API_BASE,
        },
        "query_transformer": "identity",
        "embedder": "dense",
        "vectorstore": "pgvector",
        "retriever": "vector",
        "reranker": "none",
        "generator": "openai",
        "prompt_template": (
            "You are an assistant that answers using the provided context only.\n\n"
            "Context:\n{{context}}\n\nQuestion:\n{{question}}\n\nAnswer:"
        ),
    }


def _keyword_match(answer: str) -> bool:
    lowered = answer.lower()
    return any(keyword in lowered for keyword in EXPECTED_ANSWER_KEYWORDS)


def main() -> None:
    jina_key = _ensure_live_env()
    omniroute_available = _omniroute_available()
    omniroute_model = _resolve_omniroute_model()

    from app.main import app
    from app.core.rag.manager.embedder_manager import EmbedderManager
    from app.core.rag.manager.generator_manager import GeneratorManager
    from app.core.rag.manager.query_transformer_manager import QueryTransformerManager
    from app.core.rag.manager.reranker_manager import RerankerManager
    from app.core.rag.manager.retriever_manager import RetrieverManager
    from app.core.rag.manager.vectorstore_manager import VectorStoreManager

    component_space = {
        "query_transformer": QueryTransformerManager().available_components(),
        "embedder": EmbedderManager().available_components(),
        "vectorstore": VectorStoreManager().available_components(),
        "retriever": RetrieverManager().available_components(),
        "reranker": RerankerManager().available_components(),
        "generator": GeneratorManager().available_components(),
    }

    org_id = "rag-matrix-org"
    project_id = "rag-matrix-project"
    workspace_id = "rag-matrix-workspace"

    with TestClient(app) as client:
        tenant_headers = _headers(org_id, project_id)
        workspace_headers = _headers(org_id, project_id, workspace_id)

        assert client.post(
            "/api/v1/organizations",
            json={"id": org_id, "name": "RAG Matrix Org", "description": DESCRIPTION},
        ).status_code == 201
        assert client.post(
            f"/api/v1/organizations/{org_id}/projects",
            json={"id": project_id, "name": "RAG Matrix Project", "description": DESCRIPTION},
        ).status_code == 201
        assert client.post(
            "/api/v1/workspaces",
            headers=tenant_headers,
            json={"id": workspace_id, "name": "RAG Matrix Workspace", "description": DESCRIPTION},
        ).status_code == 201

        base_config = _create_base_config(jina_key, omniroute_model)
        update_response = client.put(
            f"/api/v1/workspaces/{workspace_id}/rag-config",
            headers=workspace_headers,
            json=base_config,
        )
        update_response.raise_for_status()

        dataset_response = client.post(
            "/api/v1/knowledge-datasets",
            headers=workspace_headers,
            json={
                "workspace_id": workspace_id,
                "name": "Cyber Security PDF",
                "embedding_model": JINA_MODEL,
                "chunk_strategy": "semantic",
            },
        )
        dataset_response.raise_for_status()
        dataset_id = dataset_response.json()["id"]

        with PDF_PATH.open("rb") as handle:
            upload_response = client.post(
                f"/api/v1/knowledge-datasets/{dataset_id}/documents",
                headers=workspace_headers,
                files={"file": (PDF_PATH.name, handle.read(), "application/pdf")},
            )
        upload_response.raise_for_status()

        chunk_response = client.get(
            f"/api/v1/knowledge-datasets/{dataset_id}/chunks",
            headers=workspace_headers,
        )
        chunk_response.raise_for_status()
        chunk_count = len(chunk_response.json())

        audits: list[dict[str, Any]] = []
        live_results: list[dict[str, Any]] = []

        ordered_names = [
            "query_transformer",
            "embedder",
            "vectorstore",
            "retriever",
            "reranker",
            "generator",
        ]

        for values in itertools.product(*(component_space[name] for name in ordered_names)):
            combo = dict(zip(ordered_names, values, strict=True))
            candidate = deepcopy(base_config)
            candidate.update(combo)
            candidate["vector_store_type"] = combo["vectorstore"]
            candidate["retrieval_config"]["hybrid_search"] = combo["retriever"] == "hybrid"
            candidate["rerank_config"]["model"] = JINA_RERANK_MODEL if combo["reranker"] == "colbert" else ""

            apply_response = client.put(
                f"/api/v1/workspaces/{workspace_id}/rag-config",
                headers=workspace_headers,
                json=candidate,
            )
            if apply_response.status_code == 422:
                audits.append(
                    {
                        "combo": combo,
                        "valid": False,
                        "detail": apply_response.json().get("detail", ""),
                    }
                )
                continue
            apply_response.raise_for_status()
            audits.append({"combo": combo, "valid": True})

            if not omniroute_available:
                live_results.append(
                    {
                        "combo": combo,
                        "status": "skipped",
                        "reason": f"OmniRoute unavailable at {OMNIROUTE_API_BASE}",
                    }
                )
                continue

            query_response = client.post(
                "/v1/rag/query",
                headers=workspace_headers,
                json={
                    "workspace_id": workspace_id,
                    "knowledge_dataset_id": dataset_id,
                    "query": QUERY,
                    "top_k": 4,
                },
            )

            if query_response.status_code != 200:
                live_results.append(
                    {
                        "combo": combo,
                        "status": "error",
                        "detail": query_response.text,
                    }
                )
                continue

            query_payload = query_response.json()
            live_results.append(
                {
                    "combo": combo,
                    "status": "ok",
                    "chunk_count": len(query_payload.get("chunks", [])),
                    "answer_preview": query_payload.get("answer", "")[:200],
                    "matched_expected_keyword": _keyword_match(query_payload.get("answer", "")),
                    "top_document": (
                        query_payload.get("chunks", [{}])[0].get("document_title")
                        if query_payload.get("chunks")
                        else None
                    ),
                }
            )

    valid_audits = [audit for audit in audits if audit["valid"]]
    invalid_audits = [audit for audit in audits if not audit["valid"]]

    summary = {
        "pdf_path": str(PDF_PATH),
        "pdf_chunk_count": chunk_count,
        "omniroute_available": omniroute_available,
        "omniroute_model": omniroute_model,
        "component_space": component_space,
        "audit_summary": {
            "total": len(audits),
            "valid": len(valid_audits),
            "invalid": len(invalid_audits),
        },
        "invalid_examples": invalid_audits[:5],
        "live_results": live_results,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()