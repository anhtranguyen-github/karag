import asyncio

from backend.app.core.mongodb import mongodb_manager


async def list_docs():
    print("Listing documents in DB...")
    db = mongodb_manager.get_async_database()
    cursor = db.documents.find()
    docs = await cursor.to_list(length=100)
    for doc in docs:
        print(f"ID: {doc.get('id')}, Name: {doc.get('filename')}, WS: {doc.get('workspace_id')}")


if __name__ == "__main__":
    asyncio.run(list_docs())
