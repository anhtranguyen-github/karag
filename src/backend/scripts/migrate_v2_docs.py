import sqlite3
import uuid
from datetime import datetime

def migrate():
    # Assuming SQLite for this codebase based on earlier list_dir showing no other DB files
    db_path = "karag.db" # Default name usually
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Starting migration...")

        # 1. Create DocumentWorkspaceLink table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS document_workspace_links (
            id VARCHAR(36) PRIMARY KEY,
            document_id VARCHAR(36),
            workspace_id VARCHAR(120),
            created_at TIMESTAMP,
            UNIQUE(document_id, workspace_id)
        )
        """)
        
        # 2. Create RagDocument table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS rag_documents (
            id VARCHAR(36) PRIMARY KEY,
            document_id VARCHAR(36),
            workspace_id VARCHAR(120),
            status VARCHAR(64),
            progress INTEGER,
            error_message TEXT,
            chunk_count INTEGER,
            updated_at TIMESTAMP,
            created_at TIMESTAMP
        )
        """)

        # 3. Data Migration: Move workspace_id from documents to links
        # Check if workspace_id column still exists in documents (it might if migration is run before code update)
        cursor.execute("PRAGMA table_info(documents)")
        columns = [c[1] for c in cursor.fetchall()]
        
        if "workspace_id" in columns:
            print("Found workspace_id in documents, migrating data...")
            cursor.execute("SELECT id, workspace_id, title, status FROM documents WHERE workspace_id IS NOT NULL")
            docs = cursor.fetchall()
            
            for doc_id, workspace_id, title, status in docs:
                # Create link
                link_id = str(uuid.uuid4())
                cursor.execute(
                    "INSERT OR IGNORE INTO document_workspace_links (id, document_id, workspace_id, created_at) VALUES (?, ?, ?, ?)",
                    (link_id, doc_id, workspace_id, datetime.now())
                )
                
                # Create RAGDocument record
                rag_id = str(uuid.uuid4())
                # Backfill status: if doc status is 'completed' or 'pending', map it
                rag_status = status if status in ['completed', 'failed', 'processing', 'pending'] else 'completed'
                progress = 100 if rag_status == 'completed' else 0
                
                cursor.execute(
                    "INSERT OR IGNORE INTO rag_documents (id, document_id, workspace_id, status, progress, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (rag_id, doc_id, workspace_id, rag_status, progress, datetime.now(), datetime.now())
                )
            
            print(f"Migrated {len(docs)} documents to links and RAG records.")
        else:
            print("workspace_id column not found in documents. Skipping data migration.")

        # 4. Final step: Removing workspace_id from documents table 
        # In SQLite, this requires creating a new table and copying data
        if "workspace_id" in columns:
            print("Removing workspace_id column from documents...")
            cursor.execute("ALTER TABLE documents RENAME TO documents_old")
            cursor.execute("""
            CREATE TABLE documents (
                id VARCHAR(36) PRIMARY KEY,
                dataset_id VARCHAR(36),
                organization_id VARCHAR(120),
                project_id VARCHAR(120),
                title VARCHAR(255),
                storage_path VARCHAR(512),
                extension VARCHAR(16),
                file_size INTEGER,
                labels_json JSON,
                source VARCHAR(255),
                metadata_json JSON,
                status VARCHAR(64),
                updated_at TIMESTAMP,
                created_at TIMESTAMP
            )
            """)
            cursor.execute("""
            INSERT INTO documents (id, dataset_id, organization_id, project_id, title, storage_path, extension, file_size, labels_json, source, metadata_json, status, updated_at, created_at)
            SELECT id, dataset_id, organization_id, project_id, title, storage_path, extension, file_size, labels_json, source, metadata_json, status, updated_at, created_at
            FROM documents_old
            """)
            cursor.execute("DROP TABLE documents_old")
            print("Successfully removed workspace_id column.")

        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    migrate()
