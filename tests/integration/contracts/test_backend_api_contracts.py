import asyncio

from src.backend.app.main import app


def test_openapi_available():
    """Contract: Ensure OpenAPI schema endpoint is accessible and valid."""
    schema = app.openapi()
    assert schema["openapi"].startswith("3.")
    assert "paths" in schema
    assert len(schema["paths"]) > 0


def test_root_contract():
    """Contract: Ensure root endpoint follows expected schema."""
    health_route = next(route.endpoint for route in app.routes if getattr(route, "path", None) == "/")
    data = asyncio.run(health_route())
    assert "status" in data
    assert data["status"] == "online"
    assert "version" in data
