import pytest
from fastapi.testclient import TestClient

from app.main import app

# Ensure test isolation is handled by conftest.py


def _headers(
    *,
    org_id: str = "org-demo",
    project_id: str = "project-demo",
    workspace_id: str | None = None,
) -> dict[str, str]:
    headers = {
        "X-Organization-Id": org_id,
        "X-Project-Id": project_id,
        "X-Actor-Id": "tester",
    }
    if workspace_id:
        headers["X-Workspace-Id"] = workspace_id
    return headers


def _create_workspace(
    client: TestClient,
    *,
    workspace_id: str,
    org_id: str = "org-demo",
    project_id: str = "project-demo",
) -> dict[str, object]:
    organization_response = client.post(
        "/api/v1/organizations",
        json={
            "id": org_id,
            "name": org_id.replace("-", " ").title(),
            "description": f"Organization {org_id}",
        },
    )
    if organization_response.status_code not in {201, 409}:
        raise AssertionError(organization_response.text)
    project_response = client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={
            "id": project_id,
            "name": project_id.replace("-", " ").title(),
            "description": f"Project {project_id}",
        },
    )
    if project_response.status_code not in {201, 409}:
        raise AssertionError(project_response.text)
    response = client.post(
        "/api/v1/workspaces",
        headers=_headers(org_id=org_id, project_id=project_id),
        json={
            "id": workspace_id,
            "name": workspace_id.replace("-", " ").title(),
            "description": f"Workspace {workspace_id}",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_health_and_dependency_report() -> None:
    with TestClient(app) as client:
        health = client.get("/health")
        dependencies = client.get("/health/dependencies")

    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    assert dependencies.status_code == 200
    assert dependencies.json()["infrastructure"]["storage"] is not None


def test_organization_project_and_workspace_bootstrap() -> None:
    with TestClient(app) as client:
        organization_response = client.post(
            "/api/v1/organizations",
            json={
                "id": "org-bootstrap",
                "name": "Bootstrap Org",
                "description": "Bootstrap tenant",
            },
        )
        project_response = client.post(
            "/api/v1/organizations/org-bootstrap/projects",
            json={
                "id": "project-bootstrap",
                "name": "Bootstrap Project",
                "description": "Bootstrap project",
            },
        )
        workspace_response = client.post(
            "/api/v1/workspaces",
            headers=_headers(org_id="org-bootstrap", project_id="project-bootstrap"),
            json={
                "id": "workspace-bootstrap",
                "name": "Bootstrap Workspace",
                "description": "Bootstrap workspace",
            },
        )

    assert organization_response.status_code == 201
    assert project_response.status_code == 201
    assert workspace_response.status_code == 201





def test_workspace_crud_and_deletion() -> None:
    with TestClient(app) as client:
        _create_workspace(client, workspace_id="workspace-shared")
        create_response = client.post(
            "/api/v1/workspaces",
            headers=_headers(),
            json={
                "id": "workspace-shared",
                "name": "Shared Workspace",
                "description": "Cross-team knowledge",
            },
        )
        list_response = client.get("/api/v1/workspaces", headers=_headers())
        get_response = client.get(
            "/api/v1/workspaces/workspace-shared",
            headers=_headers(workspace_id="workspace-shared"),
        )
        delete_response = client.delete(
            "/api/v1/workspaces/workspace-shared",
            headers=_headers(workspace_id="workspace-shared"),
        )

    assert create_response.status_code == 409
    assert list_response.status_code == 200
    assert len(list_response.json()) >= 1
    assert get_response.status_code == 200
    assert delete_response.status_code == 204


def test_workspace_rag_config_updates_runtime_defaults() -> None:
    with TestClient(app) as client:
        _create_workspace(client, workspace_id="workspace-rag")
        tenant_headers = _headers(workspace_id="workspace-rag")
        default_config_response = client.get(
            "/api/v1/workspaces/workspace-rag/rag-config",
            headers=tenant_headers,
        )
        update_response = client.put(
            "/api/v1/workspaces/workspace-rag/rag-config",
            headers=tenant_headers,
            json={
                "embedding": {
                    "component": "dense",
                    "provider": "openai",
                    "model": "text-embedding-3-small",
                    "dimension": 1536,
                    "batch_size": 8,
                },
                "chunking": {
                    "component": "recursive",
                    "chunk_size": 512,
                    "chunk_overlap": 64,
                },
                "vectorstore": {
                    "component": "qdrant",
                    "collection_name": None,
                    "distance_metric": "cosine",
                    "index_type": "hnsw",
                    "vector_dimension": 1536,
                },
                "retriever": {
                    "component": "vector",
                    "top_k": 1,
                    "score_threshold": 0.0,
                },
                "reranker": {
                    "component": "none",
                    "provider": "jina",
                    "model": "cross-encoder-mini",
                },
                "rag": {
                    "reader": "marker",
                    "query_transformer": "identity",
                    "generator": "openai",
                    "prompt_template": "System\n\nContext:\n{{context}}\n\nQuestion:\n{{question}}\n\nAnswer:",
                    "max_context_tokens": 4000,
                    "context_compression": False,
                    "citation_mode": "inline",
                    "context_formatting_template": "[{index}] {text}",
                },
                "llm": {
                    "provider": "omniroute",
                    "model": "cost-saver",
                    "temperature": 0.1,
                    "max_tokens": 512,
                    "streaming": False,
                },
            },
        )
        refreshed_config = client.get(
            "/api/v1/workspaces/workspace-rag/rag-config",
            headers=tenant_headers,
        )

    assert default_config_response.status_code == 200
    assert update_response.status_code == 200
    config = refreshed_config.json()
    assert config["vectorstore"]["component"] == "qdrant"
    assert config["llm"]["model"] == "cost-saver"


def test_workspace_rag_config_safe_update_validation() -> None:
    with TestClient(app) as client:
        _create_workspace(client, workspace_id="workspace-audit")
        tenant_headers = _headers(workspace_id="workspace-audit")

        config_response = client.get(
            "/api/v1/workspaces/workspace-audit/rag-config",
            headers=tenant_headers,
        )
        current_config = config_response.json()

        invalid_candidate = {
            "embedding": {
                **current_config["embedding"],
                "component": "multi_vector",
            },
            "vectorstore": {
                **current_config["vectorstore"],
                "component": "qdrant",
                "vector_dimension": current_config["embedding"]["dimension"],
            },
            "retriever": {
                **current_config["retriever"],
                "component": "vector",
            },
            "reranker": current_config["reranker"],
            "chunking": current_config["chunking"],
            "llm": current_config["llm"],
            "rag": current_config["rag"],
        }

        update_response = client.put(
            "/api/v1/workspaces/workspace-audit/rag-config",
            headers=tenant_headers,
            json=invalid_candidate,
        )
        assert update_response.status_code == 422
