"""
BaaS Core MongoDB Migration Script (Blocks 1-5)

Run this script to create required collections and indexes for BaaS.

Usage:
    cd src/backend && python scripts/migrate_baas_collections.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.backend.app.core.mongodb import mongodb_manager


async def create_api_keys_collection():
    """Block 1: Create api_keys collection with validation."""
    db = mongodb_manager.get_async_database()

    # Create collection with validator
    try:
        await db.create_collection(
            "api_keys",
            {
                "validator": {
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["id", "workspace_id", "key_hash", "key_prefix"],
                        "properties": {
                            "id": {"bsonType": "string"},
                            "workspace_id": {"bsonType": "string"},
                            "key_hash": {"bsonType": "string"},
                            "key_prefix": {"bsonType": "string"},
                            "permissions": {
                                "bsonType": "array",
                                "items": {"bsonType": "string"},
                            },
                            "is_active": {"bsonType": "bool"},
                            "created_at": {"bsonType": "date"},
                            "expires_at": {"bsonType": ["date", "null"]},
                        },
                    }
                }
            },
        )
        print("✓ Created api_keys collection")
    except Exception as e:
        if "already exists" in str(e):
            print("✓ api_keys collection already exists")
        else:
            print(f"✗ Error creating api_keys: {e}")

    # Create indexes
    await db.api_keys.create_index("key_prefix")
    await db.api_keys.create_index("workspace_id")
    await db.api_keys.create_index("is_active")
    await db.api_keys.create_index([("workspace_id", 1), ("is_active", 1)])
    print("✓ Created api_keys indexes")


async def create_document_storages_collection():
    """Block 2: Create document_storages collection with validation."""
    db = mongodb_manager.get_async_database()

    try:
        await db.create_collection(
            "document_storages",
            {
                "validator": {
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["id", "type", "name"],
                        "properties": {
                            "id": {"bsonType": "string"},
                            "type": {"enum": ["global", "workspace"]},
                            "owner_workspace_id": {"bsonType": ["string", "null"]},
                            "name": {"bsonType": "string"},
                            "is_active": {"bsonType": "bool"},
                            "is_read_only": {"bsonType": "bool"},
                            "created_at": {"bsonType": "date"},
                        },
                    }
                }
            },
        )
        print("✓ Created document_storages collection")
    except Exception as e:
        if "already exists" in str(e):
            print("✓ document_storages collection already exists")
        else:
            print(f"✗ Error creating document_storages: {e}")

    # Create indexes
    await db.document_storages.create_index("id", unique=True)
    await db.document_storages.create_index("owner_workspace_id")
    await db.document_storages.create_index("type")
    await db.document_storages.create_index([("owner_workspace_id", 1), ("name", 1)], unique=True)
    print("✓ Created document_storages indexes")


async def update_documents_collection():
    """Block 2: Add storage_id to existing documents collection."""
    db = mongodb_manager.get_async_database()

    # Add storage_id field to existing documents without it
    result = await db.documents.update_many({"storage_id": {"$exists": False}}, {"$set": {"storage_id": "default"}})
    print(f"✓ Updated {result.modified_count} documents with storage_id")


async def create_system_config_collection():
    """Block 4: Create system_config collection."""
    db = mongodb_manager.get_async_database()

    try:
        await db.create_collection("system_config")
        print("✓ Created system_config collection")
    except Exception as e:
        if "already exists" in str(e):
            print("✓ system_config collection already exists")
        else:
            print(f"✗ Error creating system_config: {e}")

    # Create index
    await db.system_config.create_index("id", unique=True)
    print("✓ Created system_config indexes")


async def create_workspace_configs_collection():
    """Block 4: Create workspace_configs collection."""
    db = mongodb_manager.get_async_database()

    try:
        await db.create_collection("workspace_configs")
        print("✓ Created workspace_configs collection")
    except Exception as e:
        if "already exists" in str(e):
            print("✓ workspace_configs collection already exists")
        else:
            print(f"✗ Error creating workspace_configs: {e}")

    # Create index
    await db.workspace_configs.create_index("workspace_id", unique=True)
    print("✓ Created workspace_configs indexes")


async def create_usage_logs_collection():
    """Block 5: Create usage_logs collection with indexes."""
    db = mongodb_manager.get_async_database()

    try:
        await db.create_collection("usage_logs")
        print("✓ Created usage_logs collection")
    except Exception as e:
        if "already exists" in str(e):
            print("✓ usage_logs collection already exists")
        else:
            print(f"✗ Error creating usage_logs: {e}")

    # Create indexes
    await db.usage_logs.create_index("timestamp")
    await db.usage_logs.create_index([("workspace_id", 1), ("timestamp", -1)])
    await db.usage_logs.create_index("api_key_id")
    await db.usage_logs.create_index("correlation_id")

    # TTL index for automatic cleanup (90 days)
    await db.usage_logs.create_index(
        "timestamp",
        expireAfterSeconds=7776000,
        partialFilterExpression={"workspace_id": {"$exists": True}},
    )
    print("✓ Created usage_logs indexes (including TTL)")


async def migrate_existing_workspaces():
    """Create default storage units for existing workspaces."""
    db = mongodb_manager.get_async_database()

    from datetime import datetime

    async for workspace in db.workspaces.find():
        workspace_id = workspace["id"]

        # Check if default storage exists
        existing = await db.document_storages.find_one({"owner_workspace_id": workspace_id, "name": "default"})

        if existing:
            print(f"  Workspace {workspace_id}: default storage already exists")
            continue

        # Create default storage
        storage_id = f"store_{workspace_id.replace('ws_', '')}"

        await db.document_storages.insert_one(
            {
                "id": storage_id,
                "type": "workspace",
                "owner_workspace_id": workspace_id,
                "name": "default",
                "description": "Default storage for workspace",
                "is_active": True,
                "is_read_only": False,
                "allowed_workspace_ids": [workspace_id],
                "vector_store_config": {
                    "collection_name": f"ws_{workspace_id}_kb",
                    "dimension": 1536,
                    "distance_metric": "cosine",
                },
                "file_store_config": {
                    "provider": "minio",
                    "bucket": "rag-docs",
                    "prefix": f"workspaces/{workspace_id}/",
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "document_count": 0,
                "total_chunks": 0,
                "total_size_bytes": 0,
            }
        )

        # Update workspace
        await db.workspaces.update_one(
            {"id": workspace_id},
            {"$set": {"storage_ids": [storage_id], "enabled_storages": [storage_id]}},
        )

        print(f"  Workspace {workspace_id}: created default storage")


async def main():
    """Run all migrations."""
    print("=" * 60)
    print("BaaS Core MongoDB Migration (Blocks 1-5)")
    print("=" * 60)

    try:
        # Initialize connection
        print("\n[1/7] Connecting to MongoDB...")
        await mongodb_manager.connect()
        print("✓ Connected")

        # Block 1: Identity
        print("\n[2/7] Block 1: Creating API keys collection...")
        await create_api_keys_collection()

        # Block 2: Storage
        print("\n[3/7] Block 2: Creating document_storages collection...")
        await create_document_storages_collection()

        print("\n[4/7] Block 2: Updating documents collection...")
        await update_documents_collection()

        # Block 4: Control Plane
        print("\n[5/7] Block 4: Creating system config collections...")
        await create_system_config_collection()
        await create_workspace_configs_collection()

        # Block 5: Observability
        print("\n[6/7] Block 5: Creating usage logs collection...")
        await create_usage_logs_collection()

        # Migration
        print("\n[7/7] Migrating existing workspaces...")
        await migrate_existing_workspaces()

        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        import traceback

        traceback.print_exc()
        return 1

    finally:
        await mongodb_manager.close()

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
