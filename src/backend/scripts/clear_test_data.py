import asyncio

from src.backend.app.core.mongodb import mongodb_manager


async def clear_db():
    print("Clearing database collections...")
    db = mongodb_manager.get_async_database()
    await db.documents.delete_many({})
    await db.workspaces.delete_many({})
    await db.workspace_settings.delete_many({})
    print("Database cleared.")


if __name__ == "__main__":
    asyncio.run(clear_db())
