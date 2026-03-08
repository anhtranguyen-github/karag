from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


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
    assert dependencies.json()["providers"]["vector_store"] == "qdrant"


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


def test_knowledge_dataset_ingestion_and_rag_query() -> None:
    with TestClient(app) as client:
        _create_workspace(client, workspace_id="workspace-alpha")
        tenant_headers = _headers(workspace_id="workspace-alpha")
        dataset_response = client.post(
            "/api/v1/knowledge-datasets",
            headers=tenant_headers,
            json={
                "workspace_id": "workspace-alpha",
                "name": "Product Docs",
                "description": "Primary knowledge base",
                "embedding_model": "nomic-embed-text",
                "chunk_strategy": "word-window",
            },
        )
        dataset = dataset_response.json()
        upload_response = client.post(
            f"/api/v1/knowledge-datasets/{dataset['id']}/documents",
            headers=tenant_headers,
            files={"file": ("pricing.txt", b"pricing tiers enterprise support onboarding", "text/plain")},
        )
        chunks_response = client.get(
            f"/api/v1/knowledge-datasets/{dataset['id']}/chunks",
            headers=tenant_headers,
        )
        rag_response = client.post(
            "/v1/rag/query",
            headers=tenant_headers,
            json={
                "workspace_id": "workspace-alpha",
                "knowledge_dataset_id": dataset["id"],
                "query": "enterprise support pricing",
                "top_k": 3,
            },
        )

    assert dataset_response.status_code == 201
    assert upload_response.status_code == 201
    assert "document_uploaded" in upload_response.json()["events"]
    assert chunks_response.status_code == 200
    assert len(chunks_response.json()) >= 1
    assert rag_response.status_code == 200
    assert rag_response.json()["chunks"][0]["document_title"] == "pricing.txt"


def test_evaluation_dataset_run_is_separate_from_ingestion() -> None:
    with TestClient(app) as client:
        _create_workspace(client, workspace_id="workspace-eval")
        tenant_headers = _headers(workspace_id="workspace-eval")
        knowledge_response = client.post(
            "/api/v1/knowledge-datasets",
            headers=tenant_headers,
            json={
                "workspace_id": "workspace-eval",
                "name": "Policies",
                "description": "Operational policies",
                "embedding_model": "nomic-embed-text",
                "chunk_strategy": "word-window",
            },
        )
        knowledge_dataset = knowledge_response.json()
        client.post(
            f"/api/v1/knowledge-datasets/{knowledge_dataset['id']}/documents",
            headers=tenant_headers,
            files={"file": ("policy.txt", b"security reviews require audit trails", "text/plain")},
        )
        evaluation_response = client.post(
            "/api/v1/evaluation-datasets",
            headers=tenant_headers,
            json={
                "workspace_id": "workspace-eval",
                "name": "Audit Benchmarks",
                "description": "Evaluation questions",
            },
        )
        evaluation_dataset = evaluation_response.json()
        question_response = client.post(
            f"/api/v1/evaluation-datasets/{evaluation_dataset['id']}/questions",
            headers=tenant_headers,
            json={
                "question": "What do reviews require?",
                "expected_answer": "audit trails",
                "expected_context": "security reviews require audit trails",
            },
        )
        run_response = client.post(
            f"/api/v1/evaluation-datasets/{evaluation_dataset['id']}/run",
            headers=tenant_headers,
            json={"knowledge_dataset_id": knowledge_dataset["id"], "top_k": 2},
        )
        documents_response = client.get(
            "/v1/documents",
            headers=tenant_headers,
            params={"workspace_id": "workspace-eval"},
        )

    assert evaluation_response.status_code == 201
    assert question_response.status_code == 201
    assert run_response.status_code == 200
    assert run_response.json()["total_questions"] == 1
    assert documents_response.status_code == 200
    assert len(documents_response.json()) == 1


def test_tenant_isolation_requires_matching_workspace_scope() -> None:
    with TestClient(app) as client:
        _create_workspace(client, workspace_id="workspace-a")
        _create_workspace(client, workspace_id="workspace-b")
        create_response = client.post(
            "/api/v1/knowledge-datasets",
            headers=_headers(workspace_id="workspace-a"),
            json={
                "workspace_id": "workspace-a",
                "name": "Scoped Dataset",
                "description": "Tenant isolation",
                "embedding_model": "nomic-embed-text",
                "chunk_strategy": "word-window",
            },
        )
        dataset_id = create_response.json()["id"]
        forbidden_response = client.get(
            f"/api/v1/knowledge-datasets/{dataset_id}",
            headers=_headers(workspace_id="workspace-b"),
        )

    assert create_response.status_code == 201
    assert forbidden_response.status_code == 403


def test_model_registry_lifecycle_endpoints() -> None:
    with TestClient(app) as client:
        _create_workspace(client, workspace_id="workspace-models")
        tenant_headers = _headers(workspace_id="workspace-models")
        model_response = client.post(
            "/api/v1/models",
            headers=tenant_headers,
            json={
                "name": "Support Assistant",
                "type": "llm",
                "framework": "gguf",
                "description": "Customer support model",
            },
        )
        model = model_response.json()
        version_response = client.post(
            f"/api/v1/models/{model['id']}/versions",
            headers=tenant_headers,
            json={"version": "1.0.0", "release_notes": "Initial deployable build"},
        )
        version = version_response.json()
        artifact_response = client.post(
            f"/api/v1/model-versions/{version['id']}/artifacts",
            headers=tenant_headers,
            json={"name": "weights.gguf", "artifact_type": "weights"},
        )
        deployment_response = client.post(
            f"/api/v1/model-versions/{version['id']}/deployments",
            headers=tenant_headers,
            json={
                "workspace_id": "workspace-models",
                "target": "ollama",
                "inference_url": "http://ollama:11434",
                "configuration": {"replicas": 1},
            },
        )
        observability_response = client.get("/api/v1/observability/summary")

    assert model_response.status_code == 201
    assert version_response.status_code == 201
    assert artifact_response.status_code == 201
    assert deployment_response.status_code == 201
    assert observability_response.status_code == 200
    assert observability_response.json()["trace_counts"]["model_deployment"] == 1


def test_workspace_crud_and_dependency_guards() -> None:
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
        dataset_response = client.post(
            "/api/v1/knowledge-datasets",
            headers=_headers(workspace_id="workspace-shared"),
            json={
                "workspace_id": "workspace-shared",
                "name": "Workspace Docs",
                "description": "Protected by workspace",
                "embedding_model": "nomic-embed-text",
                "chunk_strategy": "word-window",
            },
        )
        delete_response = client.delete(
            "/api/v1/workspaces/workspace-shared",
            headers=_headers(workspace_id="workspace-shared"),
        )

    assert create_response.status_code == 409
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert get_response.status_code == 200
    assert dataset_response.status_code == 201
    assert delete_response.status_code == 409


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
                "embedding_provider": "openai",
                "embedding_model": "text-embedding-3-small",
                "embedding_dimension": 1536,
                "embedding_batch_size": 8,
                "vector_store_type": "qdrant",
                "vector_store_config": {
                    "collection_name": None,
                    "distance_metric": "cosine",
                    "index_type": "hnsw",
                },
                "retrieval_config": {
                    "top_k": 1,
                    "score_threshold": 0.0,
                    "hybrid_search": True,
                    "reranker_model": "cross-encoder-mini",
                    "chunk_size": 512,
                    "chunk_overlap": 64,
                },
                "reading_config": {
                    "max_context_tokens": 4000,
                    "context_compression": False,
                    "citation_mode": "inline",
                    "context_formatting_template": "[{index}] {text}",
                },
                "llm_config": {
                    "provider": "ollama",
                    "model": "llama3.1:8b",
                    "temperature": 0.1,
                    "max_tokens": 512,
                    "streaming": False,
                },
                "prompt_template": "System\\n\\nContext:\\n{{context}}\\n\\nQuestion:\\n{{question}}\\n\\nAnswer:",
            },
        )
        dataset_response = client.post(
            "/api/v1/knowledge-datasets",
            headers=tenant_headers,
            json={
                "workspace_id": "workspace-rag",
                "name": "Runtime Defaults",
                "description": "Config-aware runtime",
                "embedding_model": "text-embedding-3-small",
                "chunk_strategy": "word-window",
            },
        )
        dataset = dataset_response.json()
        upload_response = client.post(
            f"/api/v1/knowledge-datasets/{dataset['id']}/documents",
            headers=tenant_headers,
            files={"file": ("runtime.txt", b"workspace rag config controls runtime defaults", "text/plain")},
        )
        rag_response = client.post(
            "/v1/rag/query",
            headers=tenant_headers,
            json={
                "workspace_id": "workspace-rag",
                "knowledge_dataset_id": dataset["id"],
                "query": "what controls runtime defaults",
            },
        )

    assert default_config_response.status_code == 200
    assert update_response.status_code == 200
    assert dataset_response.status_code == 201
    assert upload_response.status_code == 201
    assert rag_response.status_code == 200
    assert rag_response.json()["provider"] == "ollama"
    assert rag_response.json()["model"] == "llama3.1:8b"
    assert rag_response.json()["prompt"].startswith("System")
