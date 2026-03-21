#!/usr/bin/env python3
"""Quick migration to add missing columns to the database."""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import DatabaseManager, Base
from sqlalchemy import text, inspect

db_url = os.environ.get("DATABASE_URL", "postgresql+psycopg://karag:karag@localhost:54321/karag")
db = DatabaseManager(db_url)

insp = inspect(db.engine)

# Check documents table columns
existing_cols = {c["name"] for c in insp.get_columns("documents")}
print(f"Existing documents columns: {existing_cols}")

needed = {
    "extension": "VARCHAR(16) DEFAULT ''",
    "file_size": "INTEGER DEFAULT 0",
    "labels_json": "JSON DEFAULT '[]'::json",
    "source": "VARCHAR(255) DEFAULT ''",
    "metadata_json": "JSON DEFAULT '{}'::json",
    "storage_path": "VARCHAR(512) DEFAULT ''",
}

with db.engine.begin() as conn:
    for col, col_type in needed.items():
        if col not in existing_cols:
            sql = f'ALTER TABLE documents ADD COLUMN "{col}" {col_type};'
            print(f"  Adding column: {sql}")
            conn.execute(text(sql))
        else:
            print(f"  Column '{col}' already exists")

# Ensure roles exist
from uuid import uuid4
from sqlalchemy import select
from app.core.database import RoleRow

with db.session() as session:
    for role_name in ["admin", "member", "viewer"]:
        existing = session.scalar(select(RoleRow).where(RoleRow.name == role_name))
        if not existing:
            session.add(RoleRow(id=str(uuid4()), name=role_name, description=f"{role_name} role"))
            session.flush()
            print(f"  Created role: {role_name}")
        else:
            print(f"  Role '{role_name}' already exists (id={existing.id})")

print("\nMigration complete!")
