import os
# Default tests to use the litellm integration which can route to OpenAI,
# Anthropic, or local vLLM depending on environment and settings.
os.environ.setdefault("DEFAULT_LLM_PROVIDER", "vllm")
os.environ.setdefault("DEFAULT_EMBEDDING_PROVIDER", "litellm")
# Use an in-memory SQLite database for tests unless explicitly overridden.
# This avoids requiring a running Postgres instance during test collection.
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
# Mark test run so providers can use deterministic local fallbacks.
os.environ["TESTING"] = "1"

import pytest
from sqlalchemy import text
from app.main import app as fastapi_app
from app.core.container import create_platform_container

@pytest.fixture(scope="session", autouse=True)
def initialize_app():
    if not hasattr(fastapi_app.state, "container"):
        fastapi_app.state.container = create_platform_container()
    # If running tests, stub litellm calls to avoid external network calls
    if os.getenv("TESTING"):
        try:
            import litellm

            def _fake_embedding(model: str | None = None, input: list[str] | None = None, **kwargs):
                data = []
                # produce a deterministic embedding vector (length 1536) per input
                dim = 1536
                for _ in (input or []):
                    data.append({"embedding": [0.0] * dim})
                return {"data": data}

            def _fake_completion(model: str | None = None, messages: list | None = None, **kwargs):
                text = "[test completion] "
                if messages:
                    # echo last user content if present
                    for m in reversed(messages):
                        if isinstance(m, dict) and m.get("role") == "user":
                            text += m.get("content", "")
                            break
                return {
                    "choices": [{"message": {"content": text}}],
                    "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
                }

            litellm.embedding = _fake_embedding
            litellm.completion = _fake_completion
        except Exception:
            pass
    # Ensure test database schema matches current models. This drops and
    # recreates tables so that schema changes (like the renamed document
    # storage column) are applied for the test session.
    try:
        fastapi_app.state.container.database.recreate_schema()
    except Exception:
        # If schema recreation fails, fall back to the existing initialize
        # behavior so tests still run against the current DB.
        fastapi_app.state.container.database.initialize()
    return fastapi_app

@pytest.fixture(autouse=True)
def clear_database():
    container = fastapi_app.state.container
    db = container.database
    with db.session() as session:
        # Tables to clear in order of dependencies (children first)
        tables = [
            'api_keys',
            'model_deployments',
            'model_artifacts',
            'model_versions',
            'models',
            'evaluation_runs',
            'evaluation_questions',
            'evaluation_datasets',
            'chunks',
            'documents',
            'knowledge_datasets',
            'workspace_rag_configs',
            'workspaces',
            'projects',
            'organizations',
        ]
        for table in tables:
            session.execute(text(f"DELETE FROM {table}"))
        session.commit()
