import os
import asyncio
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

# Configuration (fallback to defaults if env not set)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "ai_architect")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

DEFAULT_ADMIN_EMAIL = "admin@example.com"
DEFAULT_ADMIN_PASSWORD = "admin" # Shorter password to test bcrypt
DEFAULT_WS_ID = f"legacy_{str(uuid.uuid4())[:8]}"
DEFAULT_WS_NAME = "Legacy Archive"

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

async def migrate():
    print("Starting Multi-Tenant Migration...")
    
    mongo_client = AsyncIOMotorClient(MONGO_URI)
    db = mongo_client[MONGO_DB]
    
    # 1. Create Default User
    print(f"Checking for default admin user: {DEFAULT_ADMIN_EMAIL}")
    user = await db.users.find_one({"email": DEFAULT_ADMIN_EMAIL})
    if not user:
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": DEFAULT_ADMIN_EMAIL,
            "hashed_password": pwd_context.hash(DEFAULT_ADMIN_PASSWORD),
            "full_name": "Super Admin",
            "is_active": True,
            "is_superuser": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.users.insert_one(user)
        print(f"Created default admin user with ID: {user_id}")
    else:
        user_id = user["id"]
        print(f"Default admin user found with ID: {user_id}")
        
    # 2. Create Default Workspace
    print(f"Checking for default workspace: {DEFAULT_WS_ID}")
    ws = await db.workspaces.find_one({"id": DEFAULT_WS_ID})
    if not ws:
        ws = {
            "id": DEFAULT_WS_ID,
            "name": DEFAULT_WS_NAME,
            "owner_id": user_id,
            "description": "Legacy data workspace",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.workspaces.insert_one(ws)
        print(f"Created default workspace: {DEFAULT_WS_ID}")
    else:
        print(f"Default workspace {DEFAULT_WS_ID} already exists.")

    # 3. Update MongoDB Collections
    collections_to_scope = ["documents", "thread_metadata", "chat_messages", "tasks"]
    for coll_name in collections_to_scope:
        print(f"Updating {coll_name} with workspace_id...")
        result = await db[coll_name].update_many(
            {"workspace_id": {"$exists": False}},
            {"$set": {"workspace_id": DEFAULT_WS_ID}}
        )
        print(f"  - Updated {result.modified_count} documents in {coll_name}")
        
    # Special case for documents that might have workspace_id="vault"
    print("Updating 'vault' documents to default workspace...")
    result = await db.documents.update_many(
        {"workspace_id": "vault"},
        {"$set": {"workspace_id": DEFAULT_WS_ID}}
    )
    print(f"  - Migrated {result.modified_count} 'vault' documents to {DEFAULT_WS_ID}")

    # 4. Update Qdrant Vectors
    print("Updating Qdrant vectors...")
    qdrant_client = AsyncQdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    
    collections_info = await qdrant_client.get_collections()
    for col in collections_info.collections:
        col_name = col.name
        print(f"  - Processing collection: {col_name}")
        
        # We need to scroll and update payload for all points that don't have workspace_id or have "vault"
        offset = None
        while True:
            scroll_result = await qdrant_client.scroll(
                collection_name=col_name,
                limit=100,
                offset=offset,
                with_payload=True,
                with_vectors=False
            )
            points, offset = scroll_result
            if not points:
                break
            
            for point in points:
                current_ws = point.payload.get("workspace_id")
                if current_ws is None or current_ws == "vault":
                    await qdrant_client.set_payload(
                        collection_name=col_name,
                        payload={"workspace_id": DEFAULT_WS_ID},
                        points=[point.id]
                    )
            
            if offset is None:
                break
                
    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
