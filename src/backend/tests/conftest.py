import os
os.environ.setdefault("DEFAULT_LLM_PROVIDER", "omniroute")
os.environ.setdefault("DEFAULT_LLM_MODEL", "cost-saver")
os.environ.setdefault("DEFAULT_EMBEDDING_PROVIDER", "openai")
os.environ.setdefault("DEFAULT_EMBEDDING_MODEL", "text-embedding-3-small")
os.environ.setdefault("DEFAULT_EMBEDDING_DIMENSION", "1536")
# Use an in-memory SQLite database for tests unless explicitly overridden.
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["TESTING"] = "1"

import pytest
from sqlalchemy import text
from app.main import app as fastapi_app
from app.karag_manager import KaragManager

@pytest.fixture(scope="session", autouse=True)
def initialize_app():
    if not hasattr(fastapi_app.state, "karag_manager"):
        fastapi_app.state.karag_manager = KaragManager.startup()
    # Ensure test database schema matches current models. This drops and
    # recreates tables so that schema changes (like the renamed document
    # storage column) are applied for the test session.
    try:
        fastapi_app.state.karag_manager.database.recreate_schema()
    except Exception:
        # If schema recreation fails, fall back to the existing initialize
        # behavior so tests still run against the current DB.
        fastapi_app.state.karag_manager.database.initialize()
    return fastapi_app

@pytest.fixture(autouse=True)
def clear_database():
    db = fastapi_app.state.karag_manager.database
    with db.session() as session:
        # Tables to clear in order of dependencies (children first)
        tables = [
            'api_keys',
            'evaluation_runs',
            'evaluation_questions',
            'evaluation_datasets',
            'chunks',
            'documents',
            'workspace_rag_configs',
            'workspaces',
            'projects',
            'organizations',
        ]
        for table in tables:
            session.execute(text(f"DELETE FROM {table}"))
        session.commit()
