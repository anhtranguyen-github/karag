import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

# This E2E test validates the full hierarchical RAG platform flow:
# Organization -> Project -> Workspace -> Document -> Attach -> Ingest -> Query

@pytest.fixture
def client():
    # conftest.py handles DB clearing and app initialization
    with TestClient(app) as c:
        yield c

def test_hierarchical_rag_full_pipeline(client):
    ORG_ID = "rag-org"
    PROJECT_ID = "rag-project"
    WORKSPACE_ID = "rag-workspace"
    
    # Step 1: Create Organization
    res = client.post("/api/v1/organizations", json={
        "id": ORG_ID, "name": "RAG Org", "description": "Tenant"
    })
    assert res.status_code == 201

    # Step 2: Create Project
    res = client.post(f"/api/v1/organizations/{ORG_ID}/projects", json={
        "id": PROJECT_ID, "name": "RAG Project", "description": "Container"
    })
    assert res.status_code == 201

    # Step 3: Create Workspace
    res = client.post("/api/v1/workspaces", headers={
        "X-Organization-Id": ORG_ID, "X-Project-Id": PROJECT_ID
    }, json={
        "id": WORKSPACE_ID, "name": "RAG Workspace", "description": "Pipeline"
    })
    assert res.status_code == 201

    # Step 4: Upload Documents to Project
    # We'll upload a sample file directly to the project
    file_content = b"The hierarchy of Karag is Organization -> Project -> Workspace."
    res = client.post(
        f"/api/v1/organizations/{ORG_ID}/projects/{PROJECT_ID}/documents",
        headers={"X-Organization-Id": ORG_ID, "X-Project-Id": PROJECT_ID},
        files={"file": ("hierarchy.txt", file_content, "text/plain")}
    )
    assert res.status_code == 201
    doc_id = res.json()["id"]

    # Step 5: Attach Documents to Workspace
    # First create a knowledge dataset in the workspace
    res = client.post("/api/v1/knowledge-datasets", headers={
        "X-Organization-Id": ORG_ID, "X-Project-Id": PROJECT_ID, "X-Workspace-Id": WORKSPACE_ID
    }, json={
        "workspace_id": WORKSPACE_ID,
        "name": "E2E Dataset",
        "embedding_model": "text-embedding-3-small",
        "chunk_strategy": "recursive"
    })
    dataset_id = res.json()["id"]

    # Now attach the project document to this dataset
    res = client.post(
        f"/api/v1/knowledge-datasets/{dataset_id}/documents/{doc_id}/attach",
        headers={"X-Organization-Id": ORG_ID, "X-Project-Id": PROJECT_ID, "X-Workspace-Id": WORKSPACE_ID}
    )
    assert res.status_code == 204

    # Step 6: Run RAG Ingestion
    res = client.post(
        f"/api/v1/knowledge-datasets/{dataset_id}/ingest",
        headers={"X-Organization-Id": ORG_ID, "X-Project-Id": PROJECT_ID, "X-Workspace-Id": WORKSPACE_ID}
    )
    assert res.status_code == 202

    # Step 7: Configure Workspace RAG Settings
    # (Settings were implicitly configured during dataset creation and workspace bootstrap)
    # Let's verify we can retrieve the config
    res = client.get(
        f"/api/v1/workspaces/{WORKSPACE_ID}/rag-config",
        headers={"X-Organization-Id": ORG_ID, "X-Project-Id": PROJECT_ID, "X-Workspace-Id": WORKSPACE_ID}
    )
    assert res.status_code == 200

    # Step 8: Test Retrieval
    # Verify chunks exist for the dataset
    res = client.get(
        f"/api/v1/knowledge-datasets/{dataset_id}/chunks",
        headers={"X-Organization-Id": ORG_ID, "X-Project-Id": PROJECT_ID, "X-Workspace-Id": WORKSPACE_ID}
    )
    assert res.status_code == 200
    assert len(res.json()) > 0

    # Step 9: Run Chat Query
    res = client.post("/v1/rag/query", headers={
        "X-Organization-Id": ORG_ID, "X-Project-Id": PROJECT_ID, "X-Workspace-Id": WORKSPACE_ID
    }, json={
        "workspace_id": WORKSPACE_ID,
        "knowledge_dataset_id": dataset_id,
        "query": "What is the top-level element in Karag?",
        "top_k": 3
    })
    assert res.status_code == 200
    data = res.json()
    assert "Organization" in data["answer"]
    assert data["chunks"][0]["document_title"] == "hierarchy.txt"
