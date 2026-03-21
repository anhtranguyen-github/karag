from app.core.config import PlatformSettings
from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError

settings = PlatformSettings()
db_url = settings.database_url
print('Using DATABASE_URL=', db_url)
engine = create_engine(db_url)
with engine.connect() as conn:
    dialect = conn.dialect.name
    print('Detected dialect:', dialect)
    if dialect == 'postgresql':
        # Add column if not exists
        try:
            conn.execute(text("ALTER TABLE workspace_rag_configs ADD COLUMN IF NOT EXISTS embedding_config_json jsonb NOT NULL DEFAULT '{}'::jsonb;"))
            conn.execute(text("ALTER TABLE workspace_rag_configs ALTER COLUMN embedding_config_json SET DEFAULT NULL;"))
            print('Postgres: ensured embedding_config_json exists')
        except ProgrammingError as e:
            print('ProgrammingError:', e)
    else:
        try:
            conn.execute(text("ALTER TABLE workspace_rag_configs ADD COLUMN IF NOT EXISTS embedding_config_json JSON DEFAULT '{}'"))
            print('Non-Postgres: ensured embedding_config_json exists')
        except Exception as e:
            print('Error adding column:', e)
print('Done')
