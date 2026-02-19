from fastapi.testclient import TestClient
from backend.app.main import app
from contextlib import asynccontextmanager

# Mock lifespan to avoid DB connections during contract tests
@asynccontextmanager
async def mock_lifespan(app):
    yield

# Override the lifespan context manager
app.router.lifespan_context = mock_lifespan

client = TestClient(app)

def test_openapi_available():
    """Contract: Ensure OpenAPI schema endpoint is accessible and valid."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["openapi"].startswith("3.")
    assert "paths" in schema
    assert len(schema["paths"]) > 0

def test_root_contract():
    """Contract: Ensure root endpoint follows expected schema."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "online"
    assert "version" in data
