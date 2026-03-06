"""
Root conftest.py — loaded by pytest BEFORE any test module is collected.

Forces all DB/service connections to local Docker targets so that importing
`backend.app.main` (and the `ai_settings = AISettings()` singleton) never
hangs on cloud DNS/TLS resolution.

In pydantic-settings v2, environment variables take higher priority than the
.env file, so setting os.environ HERE (before any app module is imported)
correctly overrides the cloud URIs in .env.

To opt-out in CI (when real cloud infra is available), set:
  PYTEST_LOCAL_INFRA=false
"""

import os

_FORCE_CLOUD = os.environ.get("PYTEST_LOCAL_INFRA", "true").lower() == "false"

if not _FORCE_CLOUD:
    # Point all services to local Docker stack (./run.sh infra)
    # Override (not setdefault) so we always win over .env values
    os.environ["MONGO_URI"] = os.environ.get("TEST_MONGO_URI", "mongodb://localhost:27017")
    os.environ["MONGO_DB"] = os.environ.get("TEST_MONGO_DB", "ai_architect_test")
    os.environ["NEO4J_URI"] = os.environ.get("TEST_NEO4J_URI", "bolt://localhost:7687")
    os.environ["NEO4J_USER"] = os.environ.get("TEST_NEO4J_USER", "neo4j")
    os.environ["NEO4J_PASSWORD"] = os.environ.get("TEST_NEO4J_PASSWORD", "neo4j_password")
    os.environ["QDRANT_URL"] = os.environ.get("TEST_QDRANT_URL", "http://localhost:6333")
    os.environ["QDRANT_API_KEY"] = os.environ.get("TEST_QDRANT_API_KEY", "local-dev-key")
    os.environ["MINIO_ENDPOINT"] = os.environ.get("TEST_MINIO_ENDPOINT", "localhost:9000")
    os.environ["MINIO_ACCESS_KEY"] = os.environ.get("TEST_MINIO_ACCESS_KEY", "minioadmin")
    os.environ["MINIO_SECRET_KEY"] = os.environ.get("TEST_MINIO_SECRET_KEY", "minioadmin")
    # Disable OTEL exporting to avoid 1s retry delays on teardown (port 99999 etc.)
    os.environ["OTEL_ENABLED"] = "false"
    os.environ["OTEL_TRACES_EXPORTER"] = "none"
    os.environ["OTEL_METRICS_EXPORTER"] = "none"
